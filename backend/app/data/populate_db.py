import csv
import hashlib  # For generating deterministic user IDs or passwords if needed
import json
import logging  # Ensure logger is imported
import os
import random
import sys
from datetime import UTC, datetime
from typing import Optional

import numpy as np
import pandas as pd

# from sentence_transformers import SentenceTransformer # Previous library
from fastembed import TextEmbedding  # Using FastEmbed

# Global variables for managing the embedding model instance
embedding_model_instance: Optional[TextEmbedding] = None
current_embedding_model_name: Optional[str] = None

# Setup basic logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


# --- Database Schema (Extended) ---
# users (
#   id SERIAL PRIMARY KEY,
#   author_id INTEGER UNIQUE REFERENCES authors(id), -- A user is an author
#   email TEXT UNIQUE NOT NULL,
#   password_hash TEXT NOT NULL, -- Store hashed passwords
#   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
# );
#
# authors (
#   id SERIAL PRIMARY KEY,
#   name TEXT UNIQUE NOT NULL
# );
#
# tags (
#   id SERIAL PRIMARY KEY,
#   name TEXT UNIQUE NOT NULL
# );
#
# quotes (
#   id SERIAL PRIMARY KEY,
#   text TEXT NOT NULL,
#   author_id INTEGER REFERENCES authors(id),
#   embedding VECTOR(384), -- Dimension from all-MiniLM-L6-v2
#   is_public BOOLEAN DEFAULT TRUE,
#   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
#   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
# );
#
# quote_tags (
#   quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
#   tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
#   PRIMARY KEY (quote_id, tag_id)
# );
#
# collections (
#   id SERIAL PRIMARY KEY,
#   user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
#   name TEXT NOT NULL,
#   description TEXT,
#   is_public BOOLEAN DEFAULT TRUE,
#   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
#   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
# );
#
# collectioncontains (
#   collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
#   quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
#   added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
#   PRIMARY KEY (collection_id, quote_id)
# );
#
# userfavorites (
#   user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
#   quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
#   favorited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
#   PRIMARY KEY (user_id, quote_id)
# );
# --- End Schema ---

DEFAULT_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
# EMBEDDING_MODEL_DIM = 384 # For BAAI/bge-small-en-v1.5
# Fallback to a known FastEmbed model if the default is not found or for testing
FALLBACK_EMBEDDING_MODEL = (
    "sentence-transformers/all-MiniLM-L6-v2"  # A common, smaller model
)
# FALLBACK_EMBEDDING_DIM = 384 # For all-MiniLM-L6-v2

# Both models use 384 dimensions
EMBEDDING_DIM = 384


# Basic password hashing for mock data (DO NOT use for production)
def hash_mock_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def get_embedding_model(
    model_name: str, cache_dir: Optional[str] = None
) -> TextEmbedding:
    global embedding_model_instance, current_embedding_model_name

    try:
        if (
            current_embedding_model_name != model_name
            or embedding_model_instance is None
        ):
            logger.info(f"Initializing FastEmbed model '{model_name}'...")
            embedding_model_instance = TextEmbedding(
                model_name=model_name, cache_dir=cache_dir, threads=0
            )
            current_embedding_model_name = model_name
            logger.info(
                f"FastEmbed model '{model_name}' initialized successfully."
            )
        return embedding_model_instance
    except Exception as e:
        logger.error(
            f"Error initializing FastEmbed model '{model_name}': {e}. Attempting fallback."
        )
        try:
            if (
                current_embedding_model_name != FALLBACK_EMBEDDING_MODEL
                or embedding_model_instance is None
            ):
                logger.info(
                    f"Initializing fallback FastEmbed model '{FALLBACK_EMBEDDING_MODEL}'..."
                )
                embedding_model_instance = TextEmbedding(
                    model_name=FALLBACK_EMBEDDING_MODEL,
                    cache_dir=cache_dir,
                    threads=0,
                )
                current_embedding_model_name = FALLBACK_EMBEDDING_MODEL
                logger.info(
                    f"Fallback FastEmbed model '{FALLBACK_EMBEDDING_MODEL}' initialized successfully."
                )
            return embedding_model_instance
        except Exception as fallback_e:
            logger.error(
                f"Error initializing fallback FastEmbed model '{FALLBACK_EMBEDDING_MODEL}': {fallback_e}"
            )
            raise


def generate_sql_from_csv(
    csv_filepath: str,
    sql_filepath: str,
    num_mock_users: int = 20,
    quotes_per_collection: int = 10,
    favorites_per_user: int = 15,
    # model_name parameter removed, will use DEFAULT_EMBEDDING_MODEL
):
    """
    Reads quote data, generates mock users, collections, favorites,
    and creates an SQL file to populate a PostgreSQL database using FastEmbed.
    """
    try:
        embedding_model = get_embedding_model(
            model_name=DEFAULT_EMBEDDING_MODEL
        )
        logger.info(
            f"Successfully initialized/retrieved FastEmbed model: {current_embedding_model_name} with dimension {EMBEDDING_DIM}"
        )
    except Exception as e:
        logger.error(
            f"Fatal: Could not initialize any embedding model. Error: {e}"
        )
        sys.exit(1)

    authors_map = {}  # name -> id
    tags_map = {}  # name -> id
    quotes_list = []  # list of quote dicts for processing
    users_list = []  # list of user dicts
    collections_list = []  # list of collection dicts
    collection_quotes_links = []  # list of (collection_id, quote_id) tuples
    user_favorites_links = []  # list of (user_id, quote_id) tuples

    next_author_id = 1
    next_tag_id = 1
    next_quote_id = 1
    next_user_id = 1
    next_collection_id = 1

    logger.info(f"Processing CSV file: {csv_filepath}")
    try:
        # Read all rows to collect texts for batch embedding
        rows_for_embedding = []
        with open(csv_filepath, mode="r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                rows_for_embedding.append(row)

        if not rows_for_embedding:
            logger.error(
                f"CSV file {csv_filepath} is empty or contains no data rows."
            )
            sys.exit(1)

        quote_texts_for_embedding = [
            row.get("quote", "").strip()
            for row in rows_for_embedding
            if row.get("quote", "").strip()
        ]

        if not quote_texts_for_embedding:
            logger.error("No valid quote texts found in CSV for embedding.")
            sys.exit(1)

        logger.info(
            f"Generating embeddings for {len(quote_texts_for_embedding)} quotes in batch..."
        )
        try:
            embeddings_iter = embedding_model.embed(quote_texts_for_embedding)
            all_embeddings = list(embeddings_iter)  # Convert generator to list
            logger.info(
                f"Successfully generated {len(all_embeddings)} embeddings."
            )
            if not all_embeddings or len(all_embeddings[0]) != EMBEDDING_DIM:
                logger.error(
                    f"Embedding generation failed or returned unexpected dimension. "
                    f"Expected {EMBEDDING_DIM}, got {len(all_embeddings[0]) if all_embeddings and all_embeddings[0] is not None else 'None/Empty'}"
                )
                sys.exit(1)
        except Exception as e:
            logger.error(f"Error during batch embedding generation: {e}")
            sys.exit(1)

        embedding_idx = 0
        for i, row in enumerate(rows_for_embedding):
            quote_text = row.get("quote", "").strip()
            author_name = row.get("author", "Unknown Author").strip()
            category_str = row.get("category", "[]").strip()

            if not quote_text:
                logger.warning(
                    f"Skipping row {i + 1} due to empty quote text (already filtered for embedding)."
                )
                continue

            try:
                tag_names = ast.literal_eval(category_str)
                if not isinstance(tag_names, list):
                    tag_names = [str(tag_names)]
            except (ValueError, SyntaxError):
                # Fallback for non-list string like "tag1,tag2" or just "tag1"
                if category_str.startswith("[") and category_str.endswith("]"):
                    try:  # Attempt to re-parse if it was a stringified list like "['tag1', 'tag2']"
                        tag_names = ast.literal_eval(category_str)
                        if not isinstance(
                            tag_names, list
                        ):  # ensure it's a list
                            tag_names = [str(tag_names)]
                    except:  # if ast.literal_eval fails again, treat as comma-separated
                        category_str = category_str[1:-1]
                        tag_names = [
                            t.strip()
                            for t in category_str.split(",")
                            if t.strip()
                        ]
                else:
                    tag_names = [
                        t.strip() for t in category_str.split(",") if t.strip()
                    ]
                if (
                    not tag_names and category_str
                ):  # If split resulted in empty but original string was not empty
                    tag_names = [category_str]

            if not author_name:
                author_name = "Unknown Author"

            if author_name not in authors_map:
                authors_map[author_name] = next_author_id
                next_author_id += 1
            author_id = authors_map[author_name]

            current_quote_tag_ids = []
            for tag_name in tag_names:
                clean_tag_name = tag_name.strip()
                if not clean_tag_name:
                    continue
                if clean_tag_name not in tags_map:
                    tags_map[clean_tag_name] = next_tag_id
                    next_tag_id += 1
                current_quote_tag_ids.append(tags_map[clean_tag_name])

            # Retrieve the pre-generated embedding
            current_embedding = all_embeddings[embedding_idx]
            embedding_idx += 1

            embedding_list = (
                current_embedding.tolist()
                if isinstance(current_embedding, np.ndarray)
                else list(map(float, current_embedding))
            )

            quotes_list.append(
                {
                    "id": next_quote_id,
                    "text": quote_text,
                    "author_id": author_id,
                    "embedding": embedding_list,
                    "tag_ids": current_quote_tag_ids,
                    "is_public": True,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            )
            next_quote_id += 1
            if (i + 1) % 100 == 0:
                logger.info(
                    f"Processed {i + 1} quote rows for SQL generation..."
                )

    except FileNotFoundError:
        logger.error(f"Error: CSV file not found at {csv_filepath}")
        sys.exit(1)
    except pd.errors.EmptyDataError:  # Though we check rows_for_embedding, this is a safeguard for pd.read_csv if it were used directly
        logger.error(f"Error: CSV file is empty at {csv_filepath}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error processing CSV file {csv_filepath}: {e}")
        sys.exit(1)

    logger.info(
        f"Processed {len(quotes_list)} quotes, {len(authors_map)} authors, {len(tags_map)} tags for SQL."
    )

    # Create Mock Users
    logger.info(f"Generating {num_mock_users} mock users...")
    author_names_for_users = list(authors_map.keys())
    random.shuffle(author_names_for_users)

    for i in range(num_mock_users):
        user_author_id = None
        username_for_user = ""
        # Try to assign an existing author profile to the user
        if i < len(author_names_for_users):
            username_for_user = author_names_for_users[i]
            user_author_id = authors_map[username_for_user]
            email = f"{username_for_user.lower().replace(' ', '.').replace('[^a-z0-9.]', '')[:20]}@example.com"  # Ensure somewhat valid email prefix
        else:  # Create a new author profile for this user
            username_for_user = f"user_gen_{i + 1}"
            # Ensure this new author doesn't conflict
            if username_for_user not in authors_map:
                authors_map[username_for_user] = next_author_id
                user_author_id = next_author_id
                next_author_id += 1
            else:  # Should not happen if "user_gen_" is unique enough
                user_author_id = authors_map[username_for_user]
            email = f"user.gen.{i + 1}@example.com"

        users_list.append(
            {
                "id": next_user_id,
                "author_id": user_author_id,
                "username_for_mock_collections": username_for_user,  # For collection naming
                "email": email,
                "password_hash": hash_mock_password(f"password{i + 1}"),
                "created_at": datetime.now(UTC).isoformat(),
            }
        )
        next_user_id += 1

    # Create Mock Collections
    logger.info("Generating mock collections...")
    if users_list and quotes_list:
        for user_data in users_list:
            num_collections_for_user = random.randint(
                0, 3
            )  # User might have 0 to 3 collections
            for _ in range(num_collections_for_user):
                collection_name = f"{user_data['username_for_mock_collections']}'s Collection #{next_collection_id}"
                collections_list.append(
                    {
                        "id": next_collection_id,
                        "user_id": user_data[
                            "id"
                        ],  # Correctly use user_id from users_list
                        "name": collection_name,
                        "description": f"A mock collection by {user_data['username_for_mock_collections']}.",
                        "is_public": random.choice([True, False]),
                        "created_at": datetime.now(UTC).isoformat(),
                        "updated_at": datetime.now(UTC).isoformat(),
                    }
                )
                if quotes_list:  # Ensure there are quotes to select from
                    selected_quotes_for_coll = random.sample(
                        quotes_list,
                        k=min(len(quotes_list), quotes_per_collection),
                    )
                    for quote in selected_quotes_for_coll:
                        collection_quotes_links.append(
                            (next_collection_id, quote["id"])
                        )
                next_collection_id += 1
    logger.info(
        f"Generated {len(collections_list)} collections and {len(collection_quotes_links)} collection-quote links."
    )

    # Create Mock User Favorites
    logger.info("Generating mock user favorites...")
    if users_list and quotes_list:
        for user_data in users_list:
            if quotes_list:  # Check again, just in case
                num_favs = min(len(quotes_list), favorites_per_user)
                if num_favs > 0:  # only sample if k > 0
                    favorited_quotes = random.sample(quotes_list, k=num_favs)
                    for quote in favorited_quotes:
                        # Avoid duplicate favorites by the same user for the same quote
                        if not any(
                            fav[0] == user_data["id"] and fav[1] == quote["id"]
                            for fav in user_favorites_links
                        ):
                            user_favorites_links.append(
                                (user_data["id"], quote["id"])
                            )
    logger.info(f"Generated {len(user_favorites_links)} user favorite links.")

    logger.info(f"Generating SQL file: {sql_filepath}")
    with open(sql_filepath, "w", encoding="utf-8") as sqlfile:
        sqlfile.write(
            "-- Generated SQL for populating QuoteWeave database --\n\n"
        )
        sqlfile.write(
            "-- Ensure the pgvector extension is created: CREATE EXTENSION IF NOT EXISTS vector;\n\n"
        )

        # Authors
        sqlfile.write("-- Authors --\n")
        for name, author_id_val in authors_map.items():
            escaped_name = name.replace("'", "''")
            sqlfile.write(
                f"INSERT INTO authors (id, name) VALUES ({author_id_val}, '{escaped_name}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n"
            )
        sqlfile.write("\n")

        # Users
        sqlfile.write("-- Users --\n")
        for user_info in users_list:
            # Ensure author_id is handled if it's None (though current logic assigns one)
            author_id_sql = (
                "NULL"
                if user_info["author_id"] is None
                else user_info["author_id"]
            )
            sqlfile.write(
                f"INSERT INTO users (id, author_id, email, password_hash, created_at) VALUES ({user_info['id']}, {author_id_sql}, '{user_info['email']}', '{user_info['password_hash']}', '{user_info['created_at']}') ON CONFLICT (id) DO NOTHING;\n"
            )
        sqlfile.write("\n")

        # Tags
        sqlfile.write("-- Tags --\n")
        for name, tag_id_val in tags_map.items():
            escaped_name = name.replace("'", "''")
            sqlfile.write(
                f"INSERT INTO tags (id, name) VALUES ({tag_id_val}, '{escaped_name}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n"
            )
        sqlfile.write("\n")

        # Quotes
        sqlfile.write("-- Quotes --\n")
        for q_info in quotes_list:
            escaped_text = q_info["text"].replace("'", "''")
            # Ensure embedding is a string representation of a list
            embedding_str = str(q_info["embedding"]).replace(
                " ", ""
            )  # Compact string like "[0.1,0.2,...]"
            sqlfile.write(
                f"INSERT INTO quotes (id, text, author_id, embedding, is_public, created_at, updated_at) VALUES ({q_info['id']}, '{escaped_text}', {q_info['author_id']}, '{embedding_str}'::vector, {q_info['is_public']}, '{q_info['created_at']}', '{q_info['updated_at']}') ON CONFLICT (id) DO NOTHING;\n"
            )
        sqlfile.write("\n")

        # Quote-Tag Associations (quote_tags)
        sqlfile.write("-- Quote-Tag Associations (quote_tags) --\n")
        for q_info in quotes_list:
            for tag_id_val in q_info["tag_ids"]:
                sqlfile.write(
                    f"INSERT INTO quote_tags (quote_id, tag_id) VALUES ({q_info['id']}, {tag_id_val}) ON CONFLICT (quote_id, tag_id) DO NOTHING;\n"
                )
        sqlfile.write("\n")

        # Collections
        sqlfile.write("-- Collections --\n")
        for col_info in collections_list:
            escaped_name = col_info["name"].replace("'", "''")
            escaped_desc = col_info.get("description", "").replace(
                "'", "''"
            )  # Ensure description exists
            sqlfile.write(
                f"INSERT INTO collections (id, user_id, name, description, is_public, created_at, updated_at) VALUES ({col_info['id']}, {col_info['user_id']}, '{escaped_name}', '{escaped_desc}', {col_info['is_public']}, '{col_info['created_at']}', '{col_info['updated_at']}') ON CONFLICT (id) DO NOTHING;\n"
            )
        sqlfile.write("\n")

        # Collection-Quote Associations (collectioncontains)
        sqlfile.write(
            "-- Collection-Quote Associations (collectioncontains) --\n"
        )
        for coll_id, q_id in collection_quotes_links:
            sqlfile.write(
                f"INSERT INTO collectioncontains (collection_id, quote_id, added_at) VALUES ({coll_id}, {q_id}, '{datetime.now(UTC).isoformat()}') ON CONFLICT (collection_id, quote_id) DO NOTHING;\n"
            )
        sqlfile.write("\n")

        # User Favorites (userfavorites)
        sqlfile.write("-- User Favorites (userfavorites) --\n")
        for usr_id, q_id in user_favorites_links:
            sqlfile.write(
                f"INSERT INTO userfavorites (user_id, quote_id, favorited_at) VALUES ({usr_id}, {q_id}, '{datetime.now(UTC).isoformat()}') ON CONFLICT (user_id, quote_id) DO NOTHING;\n"
            )
        sqlfile.write("\n")

    logger.info(f"SQL file '{sql_filepath}' generated successfully.")
    logger.info(
        "Ensure 'fastembed' and 'numpy' are installed: pip install fastembed numpy"
    )
    logger.info(
        "And the pgvector extension is enabled in PostgreSQL: CREATE EXTENSION IF NOT EXISTS vector;"
    )


# Ensure ast is imported for literal_eval if not already
try:
    import ast
except ImportError:
    logger.error("Failed to import ast module. Tag parsing might be affected.")
    # Decide if this is critical enough to exit or just warn
    # sys.exit(1)


if __name__ == "__main__":
    # Determine the directory of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Construct paths relative to the script directory
    # Assumes quotes_sample.csv is in the same directory as populate_db.py
    # and the output SQL should also go there.
    # For a typical project structure, data might be in a subfolder e.g., ../data/
    # Adjust paths as per your project structure if needed.
    default_csv_file = os.path.join(script_dir, "quotes_sample.csv")
    default_sql_file = os.path.join(
        script_dir, "populate_quotes_database_full.sql"
    )

    # Use environment variables or fall back to defaults
    # This allows easier configuration in Docker or CI environments
    csv_file_to_use = os.getenv("POPULATE_CSV_FILE", default_csv_file)
    sql_file_to_use = os.getenv("POPULATE_SQL_FILE", default_sql_file)

    num_users_to_create = int(os.getenv("POPULATE_NUM_USERS", "50"))
    num_quotes_per_collection = int(
        os.getenv("POPULATE_QUOTES_PER_COLLECTION", "15")
    )
    num_favorites_per_user = int(
        os.getenv("POPULATE_FAVORITES_PER_USER", "25")
    )

    logger.info(f"Using CSV input: {csv_file_to_use}")
    logger.info(f"Using SQL output: {sql_file_to_use}")

    # Check if CSV file exists before proceeding
    if not os.path.exists(csv_file_to_use):
        logger.error(
            f"Critical: Input CSV file not found at {csv_file_to_use}. Exiting."
        )
        sys.exit(1)

    generate_sql_from_csv(
        csv_filepath=csv_file_to_use,
        sql_filepath=sql_file_to_use,
        num_mock_users=num_users_to_create,
        quotes_per_collection=num_quotes_per_collection,
        favorites_per_user=num_favorites_per_user,
    )
    logger.info(
        f"Generated comprehensive SQL population script: {sql_file_to_use}"
    )

# Required for os.path operations in __main__
# import os # Removed from here as it's now at the top
