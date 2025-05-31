import os
from dataclasses import dataclass

import psycopg


@dataclass
class DatabaseSettings:
    host: str
    port: int
    dbname: str
    user: str
    password: str


settings = DatabaseSettings(
    host=os.environ.get("POSTGRES_SERVER", "db"),
    port=int(os.environ.get("POSTGRES_PORT", "5432")),
    dbname=os.environ.get("POSTGRES_DB", "quoteweave_demo"),
    user=os.environ.get("POSTGRES_USER", "postgres"),
    password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
)


def get_connection():
    """Get a connection to the database."""
    conn = psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.dbname,
        user=settings.user,
        password=settings.password,
    )
    return conn


def get_connection_gen():
    with psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.dbname,
        user=settings.user,
        password=settings.password,
    ) as conn:
        yield conn
