"""Database actions."""

import psycopg

from dataclasses import dataclass

@dataclass
class DatabaseSettings:
    host: str
    port: int
    dbname: str
    user: str
    password: str

settings = DatabaseSettings(
    host="db",
    port=5432,
    dbname="mydb",
    user="postgres",
    password="admin"
)

def get_connection():
    """Get a connection to the database."""
    conn = psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.dbname,
        user=settings.user,
        password=settings.password
    )
    return conn

def get_connection_gen():
    with psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.dbname,
        user=settings.user,
        password=settings.password
    ) as conn:
        yield conn
