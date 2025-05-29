import os

import pytest
from app.db import get_connection_gen
from app.main import app
from fastapi.testclient import TestClient
from psycopg import Connection

TEST_SCHEMA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "schema.postgresql"
)


@pytest.fixture(scope="function")
def db_conn() -> Connection:
    conn_generator = get_connection_gen()
    db = next(conn_generator)

    try:
        with open(TEST_SCHEMA_PATH, "r") as f:
            sql_commands = f.read().split(";")
            for command in sql_commands:
                if command.strip():
                    db.execute(command.strip() + ";")
        db.commit()
        yield db
    finally:
        if db and not db.closed:
            db.close()


@pytest.fixture(scope="function")
def client(db_conn: Connection) -> TestClient:
    def override_get_db():
        yield db_conn

    original_dependency = app.dependency_overrides.get(get_connection_gen)
    app.dependency_overrides[get_connection_gen] = override_get_db

    with TestClient(app) as c:
        yield c

    if original_dependency:
        app.dependency_overrides[get_connection_gen] = original_dependency
    else:
        del app.dependency_overrides[get_connection_gen]
