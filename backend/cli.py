import argparse
import app.crud as crud
import app.model as model
import app.db as db
import app.security as security
import app.populate as populate


def main():
    parser = argparse.ArgumentParser(description="Database CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # init
    _ = subparsers.add_parser("init", help="Initiate the database.")

    # populate
    populate_parser = subparsers.add_parser("populate", help="Populate the database.")
    populate_parser.add_argument("--file", required=True, help="File with data used to populate.")
    populate_parser.add_argument("--n-entries", type=int, required=True, help="The amount of entries to read from file to populate.")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create new records")
    create_subparser = create_parser.add_subparsers(dest="create_type", help="Type of record to create")

    # Author
    create_author_parser = create_subparser.add_parser("author", help="Create a new author")
    create_author_parser.add_argument("--name", required=True, help="Author's name")

    # User from Author
    create_user_from_author_parser = create_subparser.add_parser("user-from-author", help="Create a new user from an existing author")
    create_user_from_author_parser.add_argument("--name", required=True, help="The username, matching an existing author")
    create_user_from_author_parser.add_argument("--email", required=True, help="User's email")
    create_user_from_author_parser.add_argument("--password", required=True, help="User's password")

    # User
    create_user_parser = create_subparser.add_parser("user", help="Create a new user")
    create_user_parser.add_argument("--name", required=True, help="User's name")
    create_user_parser.add_argument("--email", required=True, help="User's email")
    create_user_parser.add_argument("--password", required=True, help="User's password")

    # Quote
    create_quote_parser = create_subparser.add_parser("quote", help="Create a new quote")
    create_quote_parser.add_argument("--author-id", required=True, type=int, help="Author's ID")
    create_quote_parser.add_argument("--text", required=True, help="Quote text")
    create_quote_parser.add_argument("--is-public", action="store_true", help="Is the quote public?")

    # Collection
    create_collection_parser = create_subparser.add_parser("collection", help="Create a new collection")
    create_collection_parser.add_argument("--author-id", required=True, type=int, help="The author's ID.")
    create_collection_parser.add_argument("--name", required=True, help="Name of the collection.")
    create_collection_parser.add_argument("--description", required=True, help="Description of the collection.")
    create_collection_parser.add_argument("--is-public", action="store_true", help="Is the quote public?")

    # Tag
    create_tag_parser = create_subparser.add_parser("tag", help="Create a new tag")
    create_tag_parser.add_argument("--name", required=True, help="The name of the tag.")

    # Read command
    read_parser = subparsers.add_parser("read", help="Read records")
    read_subparsers = read_parser.add_subparsers(dest="read_type", help="Type of record to read")

    # Author by name
    read_author_by_name_parser = read_subparsers.add_parser("author-by-name", help="Read author record by name")
    read_author_by_name_parser.add_argument("--name", required=True, help="Author's name")

    # Author by ID
    read_author_by_id_parser = read_subparsers.add_parser("author-by-id", help="Read author record by ID")
    read_author_by_id_parser.add_argument("--id", required=True, type=int, help="Author's ID")

    # User by name
    read_user_by_name_parser = read_subparsers.add_parser("user-by-name", help="Read user record by name")
    read_user_by_name_parser.add_argument("--name", required=True, help="User's name")

    # User by email
    read_user_by_email_parser = read_subparsers.add_parser("user-by-email", help="Read user record by email")
    read_user_by_email_parser.add_argument("--email", required=True, help="User's email")

    # User by ID
    read_user_by_id_parser = read_subparsers.add_parser("user-by-id", help="Read user record by ID")
    read_user_by_id_parser.add_argument("--id", required=True, type=int, help="User's ID")

    args = parser.parse_args()

    with db.get_connection() as conn:
        match args.command:
            case "init":
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS author (
                        aid integer GENERATED ALWAYS AS IDENTITY,
                        name text NOT NULL UNIQUE,
                        PRIMARY KEY (aid)
                    );

                    CREATE TABLE IF NOT EXISTS auser (
                        author_id integer,
                        email text NOT NULL UNIQUE,
                        pw text NOT NULL,
                        FOREIGN KEY (author_id) REFERENCES author(aid) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS collection (
                        cid integer GENERATED ALWAYS AS IDENTITY,
                        aid integer NOT NULL,
                        name text NOT NULL,
                        description text NOT NULL,
                        is_public boolean DEFAULT false,
                        FOREIGN KEY (aid) REFERENCES author (aid) ON DELETE CASCADE,
                        UNIQUE (aid, name),
                        PRIMARY KEY (cid)
                    );

                    CREATE TABLE IF NOT EXISTS quote (
                        qid integer GENERATED ALWAYS AS IDENTITY,
                        author_id integer NOT NULL,
                        text text NOT NULL,
                        is_public boolean DEFAULT false,
                        FOREIGN KEY (author_id) REFERENCES author (aid) ON DELETE CASCADE,
                        PRIMARY KEY (qid),
                        UNIQUE (text)
                    );

                    CREATE TABLE IF NOT EXISTS collectioncontains (
                        cid integer NOT NULL,
                        qid integer NOT NULL,
                        FOREIGN KEY (cid) REFERENCES collection (cid) ON DELETE CASCADE,
                        FOREIGN KEY (qid) REFERENCES quote (qid) ON DELETE CASCADE,
                        PRIMARY KEY (cid, qid)
                    );

                    CREATE TABLE IF NOT EXISTS tag (
                        tid integer GENERATED ALWAYS AS IDENTITY,
                        name text NOT NULL UNIQUE,
                        PRIMARY KEY (tid)
                    );

                    CREATE TABLE IF NOT EXISTS taggedas (
                        qid integer NOT NULL,
                        tid integer NOT NULL,
                        FOREIGN KEY (qid) REFERENCES quote (qid) ON DELETE CASCADE,
                        FOREIGN KEY (tid) REFERENCES tag (tid) ON DELETE CASCADE,
                        PRIMARY KEY (qid, tid)
                    );
                    """
                )
            case "populate":
                populate.populate_if_necessary(conn, args.file, args.n_entries)
            case "create":
                if not hasattr(args, "create_type"):
                    raise ValueError("No create type specified")
                match args.create_type:
                    case "author":
                        query = model.CreateAuthorQuery(name=args.name)
                        author = crud.create_author(conn, query)
                        print(f"Created author: {author}")
                    case "user-from-author":
                        query = model.CreateUserFromAuthorQuery(
                            username=args.name,
                            email=args.email,
                            password=security.hash_password(args.password),
                        )
                        user = crud.create_user_from_author(conn, query)
                        print(f"Created user from author: {user}")
                    case "user":
                        query = model.CreateUserQuery(
                            username=args.name,
                            email=args.email,
                            password=security.hash_password(args.password),
                        )
                        author = crud.get_author_by_name(conn, query.username)
                        if author is not None:
                            print("A an author with the desired usedname already exists.")
                            return
                        user = crud.create_user(conn, query)
                        print(f"Created user: {user}")
                    case "quote":
                        query = model.CreateQuoteQuery(
                            author_id=args.author_id,
                            text=args.text,
                            is_public=args.is_public,
                        )
                        quote = crud.create_quote(conn, query)
                        print(f"Created quote: {quote}")
                    case "collection":
                        query = model.CreateCollectionQuery(
                            user_id=args.author_id,
                            name=args.name,
                            description=args.description,
                            is_public=args.is_public,
                        )
                        collection = crud.create_collection(conn, query)
                        print(f"Created collection: {collection}")
                    case "tag":
                        query = model.CreateTagQuery(name=args.name)
                        tag = crud.create_tag(conn, query)
                        print(f"Created tag: {tag}")
                    case _:
                        create_parser.print_help()
            case "read":
                if not hasattr(args, "read_type"):
                    raise ValueError("No read type specified")
                match args.read_type:
                    case "author-by-name":
                        author = crud.get_author_by_name(conn, args.name)
                        print(f"Author found: {author}")
                    case "author-by-id":
                        author = crud.get_author_by_id(conn, args.id)
                        print(f"Author found: {author}")
                    case "user-by-name":
                        user = crud.get_user_by_name(conn, args.name)
                        print(f"User found: {user}")
                    case "user-by-email":
                        user = crud.get_user_by_email(conn, args.email)
                        print(f"User found: {user}")
                    case "user-by-id":
                        user = crud.get_user_by_id(conn, args.id)
                        print(f"User found: {user}")
                    case _:
                        read_parser.print_help()
            case _:
                parser.print_help()


if __name__ == "__main__":
    main()
