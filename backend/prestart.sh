#! /usr/bin/env bash

set -e
set -x

python cli.py init
python cli.py populate-full --csv-file quotes_sample.csv --sql-file-name populate_quotes_database_full.sql --num-users 50 --quotes-per-collection 15 --favorites-per-user 25
python cli.py create user --name admin --email "admin@example.com" --password admin
