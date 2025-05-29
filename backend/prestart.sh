#! /usr/bin/env bash

set -e
set -x

SQL_FILE_NAME="populate_quotes_database_full.sql" # Ensure this matches the output of populate-full

python cli.py init
# The populate-full command in cli.py should ideally take an output path or be consistent
# with where prestart.sh expects the file. For now, we assume cli.py uses the default path
# inside app/data/ as per populate_db.py's __main__ block if POPULATE_SQL_FILE is not set.
python cli.py populate-full --csv-file quotes_sample.csv --sql-file-name "$SQL_FILE_NAME" --num-users 50 --quotes-per-collection 15 --favorites-per-user 25

# Execute the generated SQL file from its actual location
# cli.py generates the file into app/data/ directory, relative to /app WORKDIR.
# So, from /app, the path is data/SQL_FILE_NAME
SQL_FILE_PATH="data/$SQL_FILE_NAME"

PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_SERVER:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-quoteweave_demo}" -a -f "$SQL_FILE_PATH"

# Reset sequences for tables populated with explicit IDs
echo "Resetting database sequences..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_SERVER:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-quoteweave_demo}" -c "SELECT setval(pg_get_serial_sequence('author', 'id'), COALESCE(MAX(id), 1), true) FROM author;"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_SERVER:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-quoteweave_demo}" -c "SELECT setval(pg_get_serial_sequence('tag', 'id'), COALESCE(MAX(id), 1), true) FROM tag;"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_SERVER:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-quoteweave_demo}" -c "SELECT setval(pg_get_serial_sequence('\"user\"', 'id'), COALESCE(MAX(id), 1), true) FROM \"user\";"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_SERVER:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-quoteweave_demo}" -c "SELECT setval(pg_get_serial_sequence('quote', 'id'), COALESCE(MAX(id), 1), true) FROM quote;"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${POSTGRES_SERVER:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-quoteweave_demo}" -c "SELECT setval(pg_get_serial_sequence('collection', 'id'), COALESCE(MAX(id), 1), true) FROM collection;"

python cli.py create user --name admin --email "admin@example.com" --password admin
