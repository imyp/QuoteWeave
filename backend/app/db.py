"""Database actions."""

import argparse

import psycopg
import app.crud as crud


db_username = "postgres"
db_password = "admin"
db_host = "db"
db_port = 5432
db_name = "mydb"
db_url = f"postgresql://{db_username}:{db_password}@{db_host}:{db_port},/{db_name}"

def get_connection():
    with psycopg.connect(db_url) as conn:
        yield conn

def create_tables(conn: psycopg.Connection):
    with conn.cursor() as cur:
        user_schema = """
        CREATE TABLE user_ (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL
        );
        """
        quote_schema = """
        CREATE TABLE quote_ (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES user_(id)
        );
        """
        cur.execute(user_schema)
        cur.execute(quote_schema)
    conn.commit()

def drop_tables(conn: psycopg.Connection):
    with conn.cursor() as cur:
        cur.execute("DROP TABLE quote_;")
        cur.execute("DROP TABLE user_;")
        conn.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create database tables.")
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("create", help="Create tables")
    subparsers.add_parser("drop", help="Drop tables")
    add_user_parser = subparsers.add_parser("add-user", help="Add a user to the database")
    add_user_parser.add_argument("username", type=str, help="Username of the user")
    add_user_parser.add_argument("password", type=str, help="Password of the user")
    get_user_parser = subparsers.add_parser("get-user", help="Add a user to the database")
    get_user_parser.add_argument("username", type=str, help="Username of the user")
    args = parser.parse_args()

    with psycopg.connect(db_url) as conn:
        if args.command == "create":
            create_tables(conn)
            print("Tables created successfully.")
        elif args.command == "drop":
            drop_tables(conn)
            print("Tables dropped successfully.")
        elif args.command == "add-user":
            import app.security as security
            user = crud.add_user(conn, args.username, security.get_password_hash(args.password))
            print(f"User {args.username} added successfully.")
            print(user)
        elif args.command == "get-user":
            print(crud.get_user_by_username(conn, args.username))