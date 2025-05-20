#! /usr/bin/env bash

set -e
set -x

python cli.py init
python cli.py populate --file quotes.csv --n-entries 100
python cli.py create user --name admin --email "admin@example.com" --password admin
