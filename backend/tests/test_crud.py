import app.crud as crud
import app.model as model
import pytest
from app import security
from psycopg import Connection

TEST_AUTHOR_NAME = "Test Author"
TEST_USER_EMAIL = "testuser@example.com"
TEST_USER_PASSWORD = "strongpassword123"
TEST_QUOTE_TEXT = "This is a test quote."


@pytest.fixture
def setup_author(db_conn: Connection) -> model.Author:
    author = crud.create_author(
        db_conn, model.CreateAuthorQuery(name=TEST_AUTHOR_NAME)
    )
    return author


def test_create_and_get_author(db_conn: Connection):
    create_query = model.CreateAuthorQuery(name="Another Test Author")
    created_author = crud.create_author(db_conn, create_query)
    assert created_author.name == "Another Test Author"
    assert created_author.id is not None

    retrieved_author = crud.get_author_by_id(db_conn, created_author.id)
    assert retrieved_author is not None
    assert retrieved_author.id == created_author.id
    assert retrieved_author.name == "Another Test Author"

    retrieved_by_name = crud.get_author_by_name(db_conn, "Another Test Author")
    assert retrieved_by_name is not None
    assert retrieved_by_name.id == created_author.id


def test_create_and_get_user(db_conn: Connection, setup_author: model.Author):
    user_query = model.CreateUserQuery(
        username="crud_user",
        email="crud@example.com",
        password=TEST_USER_PASSWORD,
    )
    created_user_resp = crud.create_user(db_conn, user_query)
    assert created_user_resp.username == "crud_user"
    assert created_user_resp.email == "crud@example.com"

    retrieved_user = crud.get_user_by_name(db_conn, "crud_user")
    assert retrieved_user is not None
    assert retrieved_user.email == "crud@example.com"
    assert retrieved_user.username == "crud_user"
    assert security.check_password(TEST_USER_PASSWORD, retrieved_user.password)  # type: ignore


def test_get_or_create_tag(db_conn: Connection):
    tag1 = crud.get_or_create_tag(db_conn, "  Test Tag 1  ")
    assert tag1.name == "test tag 1"
    tag2 = crud.get_or_create_tag(db_conn, "Test Tag 1")
    assert tag1.id == tag2.id
    tag3 = crud.get_or_create_tag(db_conn, "test_tag_2")
    assert tag3.name == "test_tag_2"
    assert tag1.id != tag3.id


def test_create_quote_crud(
    db_conn: Connection, setup_author: model.Author, monkeypatch
):
    def mock_generate_embedding(text):
        return [0.1] * 384

    def mock_predict_tags(text):
        return ["mocked_tag", "another_mock"]

    monkeypatch.setattr(
        crud.embedding, "generate_embedding", mock_generate_embedding
    )
    monkeypatch.setattr(crud.tagging, "predict_tags", mock_predict_tags)

    quote_query = model.CreateQuoteQuery(
        author_id=setup_author.id, text=TEST_QUOTE_TEXT, is_public=True
    )
    created_quote = crud.create_quote(
        db_conn, quote_query, author_name=setup_author.name
    )

    assert created_quote.text == TEST_QUOTE_TEXT
    assert created_quote.author_id == setup_author.id
    assert created_quote.embedding == [0.1] * 384
    assert len(created_quote.tags) == 2
    tag_names = sorted([tag.name for tag in created_quote.tags])
    assert tag_names == sorted(["mocked_tag", "another_mock"])

    retrieved_quote = crud.get_quote_by_id(db_conn, created_quote.id)
    assert retrieved_quote is not None
    assert retrieved_quote.text == TEST_QUOTE_TEXT
    assert len(retrieved_quote.tags) == 2


def test_semantic_search_quotes(
    db_conn: Connection, setup_author: model.Author, monkeypatch
):
    def mock_generate_embedding_search(text):
        if "semantic search test quote 1" in text.lower():
            return [0.1, 0.2, 0.3] + [0.0] * 381
        if "semantic search test quote 2" in text.lower():
            return [0.4, 0.5, 0.6] + [0.0] * 381
        return [0.9] * 384

    monkeypatch.setattr(
        crud.embedding, "generate_embedding", mock_generate_embedding_search
    )
    monkeypatch.setattr(
        crud.tagging, "predict_tags", lambda text: ["search_related"]
    )

    quote1_query = model.CreateQuoteQuery(
        author_id=setup_author.id,
        text="Semantic search test quote 1 unique content",
        is_public=True,
    )
    crud.create_quote(db_conn, quote1_query, author_name=setup_author.name)
    quote2_query = model.CreateQuoteQuery(
        author_id=setup_author.id,
        text="Semantic search test quote 2 different words",
        is_public=True,
    )
    crud.create_quote(db_conn, quote2_query, author_name=setup_author.name)

    query_embedding = mock_generate_embedding_search(
        "semantic search test quote 1"
    )
    results = crud.search_quotes_semantic(db_conn, query_embedding, limit=5)

    assert len(results) >= 1
    if results:
        assert results[0].text == "Semantic search test quote 1 unique content"
