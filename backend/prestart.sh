#! /usr/bin/env bash

set -e
set -x

python app/db.py drop 
python app/db.py create
python app/db.py add-user abc 123
