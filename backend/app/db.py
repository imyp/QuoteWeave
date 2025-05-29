"""Database actions."""

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


# Read settings from environment variables, falling back to defaults
# The defaults should ideally match your docker-compose for local development ease
# or be clearly documented if they differ.
settings = DatabaseSettings(
    host=os.environ.get("POSTGRES_SERVER", "db"),
    port=int(os.environ.get("POSTGRES_PORT", "5432")),
    dbname=os.environ.get(
        "POSTGRES_DB", "quoteweave_demo"
    ),  # Defaulting to compose.yaml value
    user=os.environ.get("POSTGRES_USER", "postgres"),
    password=os.environ.get(
        "POSTGRES_PASSWORD", "postgres"
    ),  # Defaulting to compose.yaml value
)

# Debugging
# print(f"DEBUG: Database settings: {settings}")


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
