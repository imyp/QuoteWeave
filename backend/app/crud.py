import math
from typing import List, Tuple

from psycopg.connection import Connection

import app.embedding as embedding
import app.model as model
import app.security as security
import app.tagging as tagging


def create_author(
    conn: Connection, query: model.CreateAuthorQuery
) -> model.Author:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO author (name) VALUES (%s) RETURNING id", (query.name,)
        )
        author_id = cur.fetchone()
        if author_id is None:
            raise ValueError("Failed to create author")
        conn.commit()
        return model.Author(id=author_id[0], name=query.name)


def get_author_by_name(conn: Connection, name: str) -> model.Author | None:
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM author WHERE name = %s", (name,))
        response = cur.fetchone()
        if response is None:
            return None
        return model.Author(id=response[0], name=response[1])


def get_author_by_id(conn: Connection, author_id: int) -> model.Author | None:
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM author WHERE id = %s", (author_id,))
        response = cur.fetchone()
        if response is None:
            return None
        return model.Author(id=response[0], name=response[1])


def create_user(
    conn: Connection, query: model.CreateUserQuery
) -> model.UserResponse:
    author = get_author_by_name(conn, query.username)
    if author is None:
        author = create_author(
            conn, model.CreateAuthorQuery(name=query.username)
        )

    with conn.cursor() as cur:
        cur.execute(
            'SELECT id FROM "user" WHERE author_id = %s OR email = %s',
            (author.id, query.email),
        )
        if cur.fetchone() is not None:
            raise ValueError(
                "User with this username or email already exists."
            )

        hashed_password = security.hash_password(query.password)
        cur.execute(
            'INSERT INTO "user" (author_id, email, password) VALUES (%s, %s, %s) RETURNING id',
            (author.id, query.email, hashed_password),
        )
        user_id_row = cur.fetchone()
        if user_id_row is None:
            conn.rollback()
            raise ValueError("Failed to create user")
        user_id = user_id_row[0]
        conn.commit()
        return model.UserResponse(
            id=user_id, username=author.name, email=query.email
        )


def get_user_by_name(conn: Connection, name: str) -> model.User | None:
    with conn.cursor() as cur:
        cur.execute(
            'SELECT u.id as user_id, u.author_id, u.email, u.password, a.name as username FROM "user" u '
            "JOIN author a ON u.author_id = a.id WHERE a.name = %s",
            (name,),
        )
        response = cur.fetchone()
        if response is None:
            return None
        return model.User(
            id=response[0],
            author_id=response[1],
            email=response[2],
            password=response[3],
            username=response[4],
        )


def get_user_by_email(conn: Connection, email: str) -> model.User | None:
    response = conn.execute(
        "SELECT auser.author_id, author.name, auser.pw FROM auser "
        "JOIN author ON auser.author_id = author.aid WHERE auser.email = %s",
        (email,),
    ).fetchone()
    if response is None:
        return None
    user_id, username, password = response
    return model.User(
        id=user_id, username=username, email=email, password=password
    )


def get_user_by_id(conn: Connection, user_id: int) -> model.User | None:
    response = conn.execute(
        "SELECT auser.author_id, author.name, auser.email, auser.pw FROM auser "
        "JOIN author ON auser.author_id = author.aid WHERE auser.author_id = %s",
        (user_id,),
    ).fetchone()
    if response is None:
        return None
    user_id, username, email, password = response
    return model.User(
        id=user_id, username=username, email=email, password=password
    )


def create_quote(
    conn: Connection, query: model.CreateQuoteQuery, author_name: str
) -> model.Quote:
    quote_text_for_ml = f'"{query.text}" by {author_name}'
    quote_embedding = embedding.generate_embedding(query.text)

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO quote (author_id, text, is_public, embedding) "
            "VALUES (%s, %s, %s, %s) RETURNING id, created_at, updated_at",
            (query.author_id, query.text, query.is_public, quote_embedding),
        )
        quote_row = cur.fetchone()
        if quote_row is None:
            conn.rollback()
            raise ValueError("Failed to create quote")
        quote_id, created_at, updated_at = quote_row

        input_for_tagger = tagging.create_input_text(query.text, author_name)
        predicted_tag_names = tagging.predict_tags(input_for_tagger)

        created_tags = []
        for tag_name in predicted_tag_names:
            try:
                tag_obj = get_or_create_tag(conn, tag_name)
                link_quote_to_tag(conn, quote_id, tag_obj.id)
                created_tags.append(tag_obj)
            except ValueError as ve:
                print(f"Skipping tag due to error: {ve}")
        conn.commit()
        return model.Quote(
            id=quote_id,
            author_id=query.author_id,
            text=query.text,
            is_public=query.is_public,
            embedding=quote_embedding,
            tags=created_tags,
            created_at=created_at,
            updated_at=updated_at,
        )


def _map_row_to_quote(
    row: Tuple, fetched_tags: List[model.Tag]
) -> model.Quote:
    return model.Quote(
        id=row[0],
        author_id=row[1],
        text=row[2],
        is_public=row[3],
        embedding=row[4] if row[4] else None,
        created_at=row[5],
        updated_at=row[6],
        tags=fetched_tags,
    )


def get_quote_by_id(conn: Connection, quote_id: int) -> model.Quote | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, author_id, text, is_public, embedding, created_at, updated_at "
            "FROM quote WHERE id = %s",
            (quote_id,),
        )
        response = cur.fetchone()
        if response is None:
            return None
        tags = get_tags_for_quote(conn, quote_id)
        return _map_row_to_quote(response, tags)


def get_quotes_by_author(
    conn: Connection, author_id: int
) -> list[model.Quote]:
    quotes = []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, author_id, text, is_public, embedding, created_at, updated_at "
            "FROM quote WHERE author_id = %s ORDER BY created_at DESC",
            (author_id,),
        )
        for row in cur.fetchall():
            tags = get_tags_for_quote(conn, row[0])
            quotes.append(_map_row_to_quote(row, tags))
    return quotes


def get_quotes_by_collection(
    conn: Connection, collection_id: int
) -> list[model.Quote]:
    quotes = []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT q.id, q.author_id, q.text, q.is_public, q.embedding, q.created_at, q.updated_at "
            "FROM quote q JOIN collectioncontains cc ON q.id = cc.quote_id "
            "WHERE cc.collection_id = %s ORDER BY q.created_at DESC",
            (collection_id,),
        )
        for row in cur.fetchall():
            tags = get_tags_for_quote(conn, row[0])
            quotes.append(_map_row_to_quote(row, tags))
    return quotes


def get_quotes_by_tag(conn: Connection, tag_id: int) -> list[model.Quote]:
    quotes = []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT q.id, q.author_id, q.text, q.is_public, q.embedding, q.created_at, q.updated_at "
            "FROM quote q JOIN taggedas ta ON q.id = ta.quote_id "
            "WHERE ta.tag_id = %s ORDER BY q.created_at DESC",
            (tag_id,),
        )
        for row in cur.fetchall():
            tags = get_tags_for_quote(conn, row[0])
            quotes.append(_map_row_to_quote(row, tags))
    return quotes


def get_quotes_for_page(
    conn: Connection, page_size: int, page_number: int
) -> List[model.QuotePageEntry]:
    offset = (page_number - 1) * page_size
    page_entries = []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT q.id, q.text, q.is_public, q.author_id, a.name as author_name, q.created_at, q.updated_at "
            "FROM quote q JOIN author a ON q.author_id = a.id "
            "ORDER BY q.created_at DESC, q.id DESC "
            "LIMIT %s OFFSET %s;",
            (page_size, offset),
        )
        for row in cur.fetchall():
            quote_id = row[0]
            tags = get_tags_for_quote(conn, quote_id)
            page_entries.append(
                model.QuotePageEntry(
                    id=quote_id,
                    text=row[1],
                    is_public=row[2],
                    author_id=row[3],
                    author_name=row[4],
                    created_at=row[5],
                    updated_at=row[6],
                    tags=tags,
                )
            )
    return page_entries


def get_quotes_total_pages(conn: Connection, page_size: int) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM quote;")
        response = cur.fetchone()
        if response is None or response[0] is None:
            raise ValueError("Could not count rows in table quote.")
        n = response[0]
        return math.ceil(n / page_size)


def create_collection(
    conn: Connection, query: model.CreateCollectionQuery
) -> model.Collection:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO collection (author_id, name, description, is_public) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (query.author_id, query.name, query.description, query.is_public),
        )
        collection_id_row = cur.fetchone()
        if collection_id_row is None:
            raise ValueError("Failed to create collection")
        collection_id = collection_id_row[0]
        conn.commit()
        return model.Collection(
            id=collection_id,
            author_id=query.author_id,
            name=query.name,
            description=query.description,
            is_public=query.is_public,
        )


def get_collection_by_id(
    conn: Connection, collection_id: int
) -> model.Collection | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, author_id, name, description, is_public FROM collection WHERE id = %s",
            (collection_id,),
        )
        response = cur.fetchone()
        if response is None:
            return None
        return model.Collection(
            id=response[0],
            author_id=response[1],
            name=response[2],
            description=response[3],
            is_public=response[4],
        )


def get_collection_by_name(
    conn: Connection, name: str
) -> model.Collection | None:
    response = conn.execute(
        "SELECT cid, aid, name, description, is_public FROM collection WHERE name = %s",
        (name,),
    ).fetchone()
    if response is None:
        return None
    return model.Collection(
        id=response[0],
        user_id=response[1],
        name=response[2],
        description=response[3],
        is_public=response[4],
    )


def add_quote_to_collection(
    conn: Connection, quote_id: int, collection_id: int
) -> model.CollectionQuoteLink:
    with conn.cursor() as cur:
        try:
            cur.execute(
                "INSERT INTO collectioncontains (quote_id, collection_id) VALUES (%s, %s) RETURNING quote_id, collection_id",
                (quote_id, collection_id),
            )
            response = cur.fetchone()
            if response is None:
                raise ValueError(
                    "Failed to add quote to collection, INSERT returned no IDs."
                )
            conn.commit()
            return model.CollectionQuoteLink(
                quote_id=response[0], collection_id=response[1]
            )
        except Exception as e:
            conn.rollback()
            print(
                f"Error adding quote {quote_id} to collection {collection_id}: {e}"
            )
            raise ValueError(
                f"Could not add quote {quote_id} to collection {collection_id}: {e}"
            ) from e


def get_collections_from_author(
    conn: Connection, author_id: int
) -> list[model.Collection]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, author_id, name, description, is_public FROM collection WHERE author_id = %s ORDER BY name",
            (author_id,),
        )
        return [
            model.Collection(
                id=row[0],
                author_id=row[1],
                name=row[2],
                description=row[3],
                is_public=row[4],
            )
            for row in cur.fetchall()
        ]


def create_tag(conn: Connection, query: model.CreateTagQuery) -> model.Tag:
    response = conn.execute(
        "INSERT INTO tag (name) VALUES (%s) RETURNING tid", (query.name,)
    ).fetchone()
    if response is None:
        raise ValueError(f"Could not create tag with name {query.name}")
    return model.Tag(id=response[0], name=query.name)


def get_tag_by_id(conn: Connection, tag_id: int) -> model.Tag | None:
    response = conn.execute(
        "SELECT name FROM tag WHERE tid = %s", (tag_id,)
    ).fetchone()
    if response is None:
        return None
    return model.Tag(id=tag_id, name=response[0])


def get_tag_by_name(conn: Connection, tag_name: str) -> model.Tag | None:
    response = conn.execute(
        "SELECT tid, name FROM tag WHERE name = %s", (tag_name,)
    ).fetchone()
    if response is None:
        return None
    return model.Tag(id=response[0], name=tag_name)


def add_tag_to_quote(
    conn: Connection, tag: model.Tag, quote: model.Quote
) -> model.TagQuoteLink:
    response = conn.execute(
        "INSERT INTO taggedas (tid, qid) VALUES (%s, %s) RETURNING tid, qid",
        (tag.id, quote.id),
    ).fetchone()
    if response is None:
        raise ValueError("Could not add tag to quote.")
    return model.TagQuoteLink(tag_id=response[0], quote_id=response[1])


def get_or_create_tag(conn: Connection, tag_name: str) -> model.Tag:
    tag_name = tag_name.strip().lower()
    if not tag_name:
        raise ValueError("Tag name cannot be empty.")
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM tag WHERE name = %s", (tag_name,))
        tag_row = cur.fetchone()
        if tag_row:
            return model.Tag(id=tag_row[0], name=tag_row[1])
        else:
            cur.execute(
                "INSERT INTO tag (name) VALUES (%s) RETURNING id, name",
                (tag_name,),
            )
            new_tag_row = cur.fetchone()
            if not new_tag_row:
                raise ValueError(f"Failed to create tag: {tag_name}")
            conn.commit()
            return model.Tag(id=new_tag_row[0], name=new_tag_row[1])


def link_quote_to_tag(conn: Connection, quote_id: int, tag_id: int):
    with conn.cursor() as cur:
        try:
            cur.execute(
                "INSERT INTO taggedas (quote_id, tag_id) VALUES (%s, %s)",
                (quote_id, tag_id),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(
                f"Error linking quote {quote_id} to tag {tag_id}: {e}. Assuming already linked."
            )


def get_tags_for_quote(conn: Connection, quote_id: int) -> List[model.Tag]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT t.id, t.name FROM tag t "
            "JOIN taggedas ta ON t.id = ta.tag_id "
            "WHERE ta.quote_id = %s ORDER BY t.name",
            (quote_id,),
        )
        tags_data = cur.fetchall()
        return [model.Tag(id=row[0], name=row[1]) for row in tags_data]


def search_quotes_semantic(
    conn: Connection,
    query_embedding: List[float],
    limit: int = 10,
    skip: int = 0,
) -> List[model.QuotePageEntry]:
    """Searches for quotes semantically similar to the query_embedding."""
    if not query_embedding:
        return []

    results = []
    with conn.cursor() as cur:
        sql = (
            "SELECT q.id, q.text, q.is_public, q.author_id, a.name as author_name, "
            "q.created_at, q.updated_at, (q.embedding <-> %s) AS distance "
            "FROM quote q JOIN author a ON q.author_id = a.id "
            "WHERE q.embedding IS NOT NULL "
            "ORDER BY distance ASC "
            "LIMIT %s OFFSET %s;"
        )
        cur.execute(sql, (query_embedding, limit, skip))
        for row in cur.fetchall():
            quote_id = row[0]
            tags = get_tags_for_quote(conn, quote_id)
            results.append(
                model.QuotePageEntry(
                    id=quote_id,
                    text=row[1],
                    is_public=row[2],
                    author_id=row[3],
                    author_name=row[4],
                    created_at=row[5],
                    updated_at=row[6],
                    tags=tags,
                )
            )
    return results
