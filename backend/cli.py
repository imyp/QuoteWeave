import argparse
import os

import app.crud as crud
import app.db as db
import app.embedding as embedding  # For embedding generation
import app.model as model
import app.populate as populate
import app.security as security
import app.tagging as tagging  # For ML-based tagging
from app.data.populate_db import generate_sql_from_csv  # New import

# For backfill, load models once
_embedding_model_loaded_cli = False
_tagging_model_loaded_cli = False


def _ensure_models_loaded_for_cli_tasks():
    """Ensures ML models are loaded once for CLI operations like backfill."""
    global _embedding_model_loaded_cli, _tagging_model_loaded_cli
    if not _embedding_model_loaded_cli:
        print("CLI: Loading embedding model...")
        embedding.load_embedding_model()  # Uses lazy loading from embedding.py
        _embedding_model_loaded_cli = True
        print("CLI: Embedding model ready.")
    if not _tagging_model_loaded_cli:
        print("CLI: Loading tagging model...")
        tagging.load_model()  # Uses lazy loading from tagging.py
        _tagging_model_loaded_cli = True
        print("CLI: Tagging model ready.")


def backfill_quotes_embeddings_and_tags(conn, batch_size: int = 32):
    """Iterates through existing quotes, generates embeddings (in batches) and tags, and updates the DB."""
    _ensure_models_loaded_for_cli_tasks()
    print(
        f"Starting backfill for quote embeddings and tags (batch size: {batch_size})..."
    )

    quotes_processed = 0
    quotes_failed = 0

    with conn.cursor() as cur:
        cur.execute(
            "SELECT q.id, q.text, q.author_id, a.name as author_name "
            "FROM quote q JOIN author a ON q.author_id = a.id "
            "WHERE q.embedding IS NULL OR NOT EXISTS (SELECT 1 FROM taggedas ta WHERE ta.quote_id = q.id) "
            "ORDER BY q.id"
        )
        all_quotes_to_process = cur.fetchall()

        if not all_quotes_to_process:
            print("No quotes found requiring embedding or tag backfill.")
            return

        total_quotes_to_process = len(all_quotes_to_process)
        print(
            f"Found {total_quotes_to_process} quotes to process for embeddings and tags."
        )

        for i in range(0, total_quotes_to_process, batch_size):
            batch_data = all_quotes_to_process[i : i + batch_size]
            quote_texts_in_batch = [data[1] for data in batch_data]

            print(
                f"Processing batch {i // batch_size + 1}/{(total_quotes_to_process + batch_size - 1) // batch_size} (quotes {i + 1}-{min(i + batch_size, total_quotes_to_process)})... "
            )

            try:
                batch_embeddings = embedding.generate_embeddings_batch(
                    quote_texts_in_batch
                )

                if len(batch_embeddings) != len(batch_data):
                    print(
                        f"  ERROR: Mismatch in batch data and embeddings length for batch starting at index {i}. Skipping this batch."
                    )
                    quotes_failed += len(batch_data)
                    continue

                for idx_in_batch, quote_data in enumerate(batch_data):
                    quote_id, quote_text, author_id, author_name = quote_data
                    quote_embedding_vector = batch_embeddings[idx_in_batch]

                    try:
                        # print(f"  Updating quote ID: {quote_id} - \"{quote_text[:30]}...\"") # More verbose logging
                        cur.execute(
                            "UPDATE quote SET embedding = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (quote_embedding_vector, quote_id),
                        )

                        input_for_tagger = tagging.create_input_text(
                            quote_text, author_name
                        )
                        predicted_tag_names = tagging.predict_tags(
                            input_for_tagger
                        )

                        linked_tags_count = 0
                        for tag_name in predicted_tag_names:
                            try:
                                tag_obj = crud.get_or_create_tag(
                                    conn, tag_name
                                )
                                crud.link_quote_to_tag(
                                    conn, quote_id, tag_obj.id
                                )
                                linked_tags_count += 1
                            except ValueError as ve_tag:
                                print(
                                    f"    Skipping tag '{tag_name}' for quote ID {quote_id} due to: {ve_tag}"
                                )
                        # print(f"    Linked {linked_tags_count} tags for quote ID: {quote_id}") # More verbose

                        conn.commit()  # Commit after each quote fully processed (embedding + tags)
                        quotes_processed += 1
                    except Exception as e_quote:
                        conn.rollback()
                        print(
                            f"    ERROR processing individual quote ID {quote_id} within batch: {e_quote}"
                        )
                        quotes_failed += 1
            except Exception as e_batch:
                conn.rollback()  # Rollback for the whole batch update attempt if batch embedding fails
                print(
                    f"  ERROR processing batch starting at index {i}: {e_batch}"
                )
                quotes_failed += len(batch_data)  # Mark all in batch as failed

    print(
        f"Backfill complete. Processed: {quotes_processed}, Failed: {quotes_failed}."
    )


def main():
    parser = argparse.ArgumentParser(description="Database CLI")
    subparsers = parser.add_subparsers(
        dest="command", help="Command to execute", required=True
    )

    _ = subparsers.add_parser("init", help="Initialize the database.")

    populate_parser = subparsers.add_parser(
        "populate", help="Populate the database."
    )
    populate_parser.add_argument(
        "--file", required=True, help="File with data used to populate."
    )
    populate_parser.add_argument(
        "--n-entries",
        type=int,
        required=True,
        help="The amount of entries to read from file to populate.",
    )

    backfill_parser = subparsers.add_parser(
        "backfill-quotes",
        help="Backfill existing quotes with embeddings and tags.",
    )
    backfill_parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Number of quotes to process in each embedding batch (default: 32)",
    )

    # New parser for populate-full
    populate_full_parser = subparsers.add_parser(
        "populate-full",
        help="Populate the database with comprehensive mock data including users, collections, and favorites from quotes_sample.csv.",
    )
    populate_full_parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-population even if data exists (use with caution).",
    )
    populate_full_parser.add_argument(
        "--csv-file",
        default="data/quotes_sample.csv",  # Default to the sample CSV in the data directory
        help="Path to the CSV file to use for quotes (relative to app root).",
    )
    populate_full_parser.add_argument(
        "--sql-file-name",
        default="populate_quotes_database_full.sql",
        help="Name of the generated SQL file in the data directory.",
    )
    populate_full_parser.add_argument(
        "--num-users",
        type=int,
        default=50,
        help="Number of mock users to create.",
    )
    populate_full_parser.add_argument(
        "--quotes-per-collection",
        type=int,
        default=15,
        help="Max quotes per mock collection.",
    )
    populate_full_parser.add_argument(
        "--favorites-per-user",
        type=int,
        default=25,
        help="Max favorites per mock user.",
    )

    create_parser = subparsers.add_parser("create", help="Create new records")
    create_subparser = create_parser.add_subparsers(
        dest="create_type", help="Type of record to create", required=True
    )

    create_author_parser = create_subparser.add_parser(
        "author", help="Create a new author"
    )
    create_author_parser.add_argument(
        "--name", required=True, help="Author's name"
    )

    # create_user_from_author_parser = create_subparser.add_parser("user-from-author", help="Create a new user from an existing author")
    # ... (This command seems to have been removed or merged logic with 'user' previously, ensure consistency)

    create_user_parser = create_subparser.add_parser(
        "user", help="Create a new user (and author if doesn't exist)"
    )
    create_user_parser.add_argument(
        "--name", required=True, help="User's name (becomes author name)"
    )
    create_user_parser.add_argument(
        "--email", required=True, help="User's email"
    )
    create_user_parser.add_argument(
        "--password", required=True, help="User's password"
    )

    create_quote_parser = create_subparser.add_parser(
        "quote", help="Create a new quote"
    )
    create_quote_parser.add_argument(
        "--author-id", required=True, type=int, help="Author's ID"
    )
    create_quote_parser.add_argument(
        "--text", required=True, help="Quote text"
    )
    create_quote_parser.add_argument(
        "--is-public", action="store_true", help="Is the quote public?"
    )

    create_collection_parser = create_subparser.add_parser(
        "collection", help="Create a new collection"
    )
    create_collection_parser.add_argument(
        "--author-id", required=True, type=int, help="The author's ID."
    )
    create_collection_parser.add_argument(
        "--name", required=True, help="Name of the collection."
    )
    create_collection_parser.add_argument(
        "--description", required=True, help="Description of the collection."
    )
    create_collection_parser.add_argument(
        "--is-public", action="store_true", help="Is the collection public?"
    )

    create_tag_parser = create_subparser.add_parser(
        "tag", help="Create a new tag (or get existing)"
    )
    create_tag_parser.add_argument(
        "--name", required=True, help="The name of the tag."
    )

    read_parser = subparsers.add_parser("read", help="Read records")
    read_subparsers = read_parser.add_subparsers(
        dest="read_type", help="Type of record to read", required=True
    )

    read_author_by_name_parser = read_subparsers.add_parser(
        "author-by-name", help="Read author record by name"
    )
    read_author_by_name_parser.add_argument(
        "--name", required=True, help="Author's name"
    )

    read_author_by_id_parser = read_subparsers.add_parser(
        "author-by-id", help="Read author record by ID"
    )
    read_author_by_id_parser.add_argument(
        "--id", required=True, type=int, help="Author's ID"
    )

    args = parser.parse_args()

    # Ensure APP_DIR is an absolute path to the /app directory where cli.py is located
    # This assumes cli.py is in the root of the /app directory in the container.
    APP_DIR = os.path.dirname(os.path.abspath(__file__))  # Should be /app

    if args.command == "init":
        with db.get_connection() as conn:
            populate.init_db(conn)
        print("Database initialized.")
    elif args.command == "populate":
        # Ensure file path is absolute or relative to APP_DIR if not already.
        # The populate.py script might handle this, but being explicit here can help.
        data_file_path = args.file
        if not os.path.isabs(data_file_path):
            data_file_path = os.path.join(APP_DIR, data_file_path)

        if not os.path.exists(data_file_path):
            print(
                f"Error: Data file for populate not found at {data_file_path}. CWD: {os.getcwd()}"
            )
            return 1  # Indicate error

        with db.get_connection() as conn:
            populate.populate_if_necessary(
                conn, data_file_path, args.n_entries
            )
    elif args.command == "populate-full":
        # Construct paths relative to APP_DIR (/app)
        # args.csv_file is 'data/quotes_sample.csv' by default or 'quotes_sample.csv' from prestart.sh
        # args.sql_file_name is 'populate_quotes_database_full.sql'

        csv_relative_path = args.csv_file
        if not csv_relative_path.startswith(
            "data/"
        ):  # Ensure it's in the data subdirectory
            csv_input_path = os.path.join(
                APP_DIR, "data", os.path.basename(csv_relative_path)
            )
        else:
            csv_input_path = os.path.join(APP_DIR, csv_relative_path)

        # SQL file should be generated into the /app/data/ directory
        sql_output_path = os.path.join(APP_DIR, "data", args.sql_file_name)

        # Create the data directory if it doesn't exist (though Docker COPY should handle it)
        os.makedirs(os.path.join(APP_DIR, "data"), exist_ok=True)

        print(f"CLI populate-full: Using CSV input: {csv_input_path}")
        print(f"CLI populate-full: SQL output target: {sql_output_path}")

        if not os.path.exists(csv_input_path):
            print(
                f"Error: CSV input file not found at {csv_input_path}. CWD: {os.getcwd()}"
            )
            return 1  # Indicate error

        try:
            print(
                f"CLI: Attempting to generate SQL file: {sql_output_path} from {csv_input_path}"
            )
            generate_sql_from_csv(
                csv_filepath=csv_input_path,
                sql_filepath=sql_output_path,
                num_mock_users=args.num_users,
                quotes_per_collection=args.quotes_per_collection,
                favorites_per_user=args.favorites_per_user,
            )
            print(
                f"CLI: SQL file generation call complete for: {sql_output_path}"
            )
        except Exception as e:
            print(
                f"CLI: Error during SQL file generation (generate_sql_from_csv call): {e}"
            )
            # It's critical that generate_sql_from_csv doesn't fail silently if it's supposed to create the file.
            # If generate_sql_from_csv itself handles errors and returns, the file might not be created.
            return 1  # Indicate error

        if not os.path.exists(sql_output_path):
            print(
                f"Error: SQL file not found at {sql_output_path} after generation attempt. CWD: {os.getcwd()}. Check logs from generate_sql_from_csv for errors (e.g., model download)."
            )
            return 1  # Indicate error
        else:
            print(
                f"CLI: Successfully verified generated SQL file exists at: {sql_output_path}"
            )

        with db.get_connection() as conn:
            print(f"CLI: Executing generated SQL file: {sql_output_path}")
            try:
                with open(sql_output_path, "r", encoding="utf-8") as f:
                    sql_commands = f.read()
                if not sql_commands.strip():
                    print(
                        f"Warning: The generated SQL file {sql_output_path} is empty."
                    )
                else:
                    with conn.cursor() as cur:
                        cur.execute(sql_commands)
                    conn.commit()
                    print(
                        f"CLI: Successfully executed generated SQL from {sql_output_path}."
                    )
            except Exception as e:
                conn.rollback()
                print(
                    f"CLI: Error executing generated SQL file {sql_output_path}: {e}"
                )
                return 1  # Indicate error

    elif args.command == "backfill-quotes":
        with db.get_connection() as conn:
            backfill_quotes_embeddings_and_tags(
                conn, batch_size=args.batch_size
            )
        return

    # CRUD commands that need a connection
    with db.get_connection() as conn:
        match args.command:
            case "create":
                match args.create_type:
                    case "author":
                        query = model.CreateAuthorQuery(name=args.name)
                        author = crud.create_author(conn, query)
                        print(f"Created author: {author}")
                    case "user":
                        # Special handling for default admin user creation if that's the intent.
                        # This is a bit of a heuristic. A more robust way would be a dedicated command
                        # or environment variable for the initial admin password.
                        password_to_use = args.password
                        if (
                            args.name == "admin"
                            and args.email == "admin@example.com"
                            and args.password == "admin"
                        ):
                            password_to_use = "SecurePwd123!"
                            print(
                                f"Using default strong password for admin user: {args.name}"
                            )

                        query = model.CreateUserQuery(
                            username=args.name,
                            email=args.email,
                            password=password_to_use,
                        )
                        try:
                            user_resp = crud.create_user(conn, query)
                            print(
                                f"Created user: ID {user_resp.id}, Username {user_resp.username}, Email {user_resp.email}"
                            )
                        except ValueError as e:
                            print(f"Error creating user: {e}")
                    case "quote":
                        author = crud.get_author_by_id(conn, args.author_id)
                        if not author:
                            print(
                                f"Error: Author with ID {args.author_id} not found."
                            )
                            return
                        query = model.CreateQuoteQuery(
                            author_id=args.author_id,
                            text=args.text,
                            is_public=args.is_public,
                        )
                        new_quote = crud.create_quote(
                            conn, query, author_name=author.name
                        )
                        print(f"Created quote: {new_quote}")
                    case "collection":
                        query = model.CreateCollectionQuery(
                            author_id=args.author_id,
                            name=args.name,
                            description=args.description,
                            is_public=args.is_public,
                        )
                        collection = crud.create_collection(conn, query)
                        print(f"Created collection: {collection}")
                    case "tag":
                        tag = crud.get_or_create_tag(conn, args.name)
                        print(f"Tag ensured/retrieved: {tag}")
                    case _:
                        create_parser.print_help()
            case "read":
                match args.read_type:
                    case "author-by-name":
                        author = crud.get_author_by_name(conn, args.name)
                        print(
                            f"Author: {author}"
                            if author
                            else "Author not found."
                        )
                    case "author-by-id":
                        author = crud.get_author_by_id(conn, args.id)
                        print(
                            f"Author: {author}"
                            if author
                            else "Author not found."
                        )
                    # Add other read commands here if needed, using new CRUD functions
                    case _:
                        read_parser.print_help()
            case _:
                parser.print_help()


if __name__ == "__main__":
    main()
