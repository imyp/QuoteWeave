import json
import math
from typing import List, Optional, Tuple

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


def get_or_create_author_by_name(conn: Connection, name: str) -> model.Author:
    author = get_author_by_name(conn, name)
    if author:
        return author
    return create_author(conn, model.CreateAuthorQuery(name=name))


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
            'INSERT INTO "user" (author_id, email, password_hash) VALUES (%s, %s, %s) RETURNING id',
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
            'SELECT u.id as user_id, u.author_id, u.email, u.password_hash, a.name as username FROM "user" u '
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
            password_hash=response[3],
            username=response[4],
        )


def get_user_by_email(conn: Connection, email: str) -> model.User | None:
    response = conn.execute(
        'SELECT "user".id, author.name, "user".email, "user".password_hash FROM "user" '
        'JOIN author ON "user".author_id = author.id WHERE "user".email = %s',
        (email,),
    ).fetchone()
    if response is None:
        return None
    user_id, username, email_from_db, password_hash_val = response
    return model.User(
        id=user_id,
        username=username,
        email=email_from_db,
        password_hash=password_hash_val,
    )


def get_user_by_id(conn: Connection, user_id: int) -> model.User | None:
    response = conn.execute(
        'SELECT u.id, u.author_id, a.name as username, u.email, u.password_hash FROM "user" u '
        "JOIN author a ON u.author_id = a.id WHERE u.id = %s",
        (user_id,),
    ).fetchone()
    if response is None:
        return None
    (
        user_id_from_db,
        author_id_val,
        username,
        email_from_db,
        password_hash_val,
    ) = response
    return model.User(
        id=user_id_from_db,
        author_id=author_id_val,
        username=username,
        email=email_from_db,
        password_hash=password_hash_val,
    )


def update_user_password(
    conn: Connection, user_id: int, payload: model.ChangePasswordPayload
) -> bool:
    # First, verify the current password
    user = get_user_by_id(
        conn, user_id
    )  # Assumes get_user_by_id returns a model.User with a password_hash field
    if not user or not user.password_hash:
        raise ValueError("User not found or password not set.")

    if not security.check_password(
        payload.current_password, user.password_hash
    ):
        raise ValueError("Incorrect current password.")

    new_hashed_password = security.hash_password(payload.new_password)

    with conn.cursor() as cur:
        cur.execute(
            'UPDATE "user" SET password_hash = %s WHERE id = %s',
            (new_hashed_password, user_id),
        )
        conn.commit()
        return cur.rowcount > 0


def update_user_preferences(
    conn: Connection, user_id: int, payload: model.UpdateUserProfilePayload
) -> model.UserResponse:
    print(
        f"Mock update_user_preferences called for user_id: {user_id} with payload: {payload.model_dump_json(exclude_none=True)}"
    )

    user = get_user_by_id(conn, user_id)
    if not user:
        raise ValueError("User not found during preference update.")

    return model.UserResponse(
        id=user.id, username=user.username, email=user.email
    )


def update_user_profile(
    conn: Connection, user_id: int, payload: model.UpdateUserProfilePayload
) -> model.UserResponse:
    # Construct parts of the query dynamically based on what's provided in the payload
    update_fields = []
    params = {}

    if payload.username is not None:
        # Check if the new username (which is an author name) is already taken by another author
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id FROM author WHERE name = %s AND id != (SELECT author_id FROM "user" WHERE id = %s)',
                (payload.username, user_id),
            )
            if cur.fetchone() is not None:
                raise ValueError(
                    f"Username '{payload.username}' is already taken."
                )
        update_fields.append("name = %(username)s")
        params["username"] = payload.username

    if payload.email is not None:
        # Check if the new email is already taken by another user
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id FROM "user" WHERE email = %s AND id != %s',
                (payload.email, user_id),
            )
            if cur.fetchone() is not None:
                raise ValueError(f"Email '{payload.email}' is already taken.")
        update_fields.append("email = %(email)s")
        params["email"] = payload.email

    if not update_fields:
        # No fields to update, just fetch and return current user data
        user = get_user_by_id(conn, user_id)
        if not user:
            raise ValueError("User not found")
        return model.UserResponse(
            id=user.id, username=user.username, email=user.email
        )

    params["user_id"] = user_id

    with conn.cursor() as cur:
        # Update user's email if provided
        if "email" in params:
            cur.execute(
                'UPDATE "user" SET email = %(email)s WHERE id = %(user_id)s',
                {"email": params["email"], "user_id": user_id},
            )

        # Update author's name (username) if provided
        if "username" in params:
            cur.execute(
                'UPDATE author SET name = %(username)s WHERE id = (SELECT author_id FROM "user" WHERE id = %(user_id)s)',
                {"username": params["username"], "user_id": user_id},
            )
        conn.commit()

    # Fetch and return the updated user data
    updated_user = get_user_by_id(conn, user_id)
    if not updated_user:
        # Should not happen if update was successful and user existed
        raise ValueError("Failed to retrieve user after update.")

    return model.UserResponse(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
    )


def create_quote(
    conn: Connection, query: model.CreateQuoteQuery, author_name: str
) -> model.Quote:
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


def create_quote_with_client_payload(
    conn: Connection, payload: model.CreateQuoteClientPayload, user_id: int
) -> model.QuotePageEntry:
    author = get_or_create_author_by_name(conn, payload.authorName)
    quote_embedding = embedding.generate_embedding(payload.text)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO quote (author_id, text, is_public, embedding)
            VALUES (%(author_id)s, %(text)s, %(is_public)s, %(embedding)s)
            RETURNING id, created_at, updated_at;
            """,
            {
                "author_id": author.id,
                "text": payload.text,
                "is_public": True,
                "embedding": quote_embedding,
            },
        )
        quote_row = cur.fetchone()
        if quote_row is None:
            conn.rollback()
            raise ValueError("Failed to create quote in database.")

        quote_id, created_at, updated_at = quote_row

        created_tags_names: List[str] = []
        if payload.tags:
            for tag_name in payload.tags:
                if tag_name.strip():
                    try:
                        tag_obj = get_or_create_tag(conn, tag_name.strip())
                        link_quote_to_tag(conn, quote_id, tag_obj.id)
                        created_tags_names.append(tag_obj.name)
                    except ValueError as ve:
                        print(f"Skipping tag '{tag_name}' due to error: {ve}")

        conn.commit()

        return model.QuotePageEntry(
            id=quote_id,
            text=payload.text,
            authorId=author.id,
            authorName=author.name,
            tags=created_tags_names,
            isFavorited=False,
            favoriteCount=0,
        )


def _map_row_to_quote(
    row: Tuple, fetched_tags: List[model.Tag]
) -> model.Quote:
    embedding_value = row[4]
    if isinstance(embedding_value, str):
        try:
            embedding_value = json.loads(embedding_value)
        except json.JSONDecodeError:
            embedding_value = None
    elif not isinstance(embedding_value, list):
        embedding_value = None

    return model.Quote(
        id=row[0],
        author_id=row[1],
        text=row[2],
        is_public=row[3],
        embedding=embedding_value,
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


def get_quote_details_for_page_entry(
    conn: Connection, quote_id: int, current_user_id: Optional[int] = None
) -> model.QuotePageEntry | None:
    with conn.cursor() as cur:
        query = """
            SELECT
                q.id,
                q.text,
                a.id AS author_id,
                a.name AS author_name,
                COALESCE(fc.favorite_count, 0) as favorite_count,
                CASE
                    WHEN CAST(%(user_id)s AS INTEGER) IS NOT NULL THEN EXISTS (
                        SELECT 1 FROM user_quote_favorite f
                        WHERE f.quote_id = q.id AND f.user_id = CAST(%(user_id)s AS INTEGER)
                    )
                    ELSE FALSE
                END as is_favorited,
                COALESCE(
                    (SELECT array_agg(t.name ORDER BY t.name) FROM tag t JOIN taggedas ta ON t.id = ta.tag_id WHERE ta.quote_id = q.id),
                    ARRAY[]::VARCHAR[]
                ) as tags,
                CASE
                    WHEN CAST(%(user_id)s AS INTEGER) IS NOT NULL THEN (
                        SELECT COALESCE(json_agg(json_build_object('id', coll.id, 'name', coll.name) ORDER BY coll.name), '[]'::json)
                        FROM collection coll
                        JOIN collectioncontains cc ON coll.id = cc.collection_id
                        WHERE cc.quote_id = q.id
                        AND coll.author_id = (SELECT author_id FROM "user" WHERE id = CAST(%(user_id)s AS INTEGER))
                    )
                    ELSE '[]'::json
                END AS user_collections
            FROM quote q
            JOIN author a ON q.author_id = a.id
            LEFT JOIN (
                SELECT quote_id, COUNT(*) as favorite_count
                FROM user_quote_favorite
                GROUP BY quote_id
            ) AS fc ON q.id = fc.quote_id
            WHERE q.id = %(quote_id)s;
        """
        cur.execute(query, {"quote_id": quote_id, "user_id": current_user_id})
        row = cur.fetchone()

        if row is None:
            return None

        # Ensure user_collections is properly parsed (it should be a list of dicts or None)
        user_collections_data = row[7]
        if isinstance(
            user_collections_data, str
        ):  # Handle if DB returns JSON string
            try:
                user_collections_data = json.loads(user_collections_data)
            except json.JSONDecodeError:
                user_collections_data = []  # Default to empty list on error
        elif user_collections_data is None:
            user_collections_data = []

        return model.QuotePageEntry(
            id=row[0],
            text=row[1],
            authorId=row[2],
            authorName=row[3],
            favoriteCount=row[4],
            isFavorited=row[5],
            tags=row[6] if row[6] is not None else [],
            userCollections=user_collections_data,
        )


def get_quotes_for_page(
    conn: Connection,
    page_size: int,
    page_number: int,
    current_user_id: Optional[int] = None,
    author_id: Optional[int] = None,
) -> List[model.QuotePageEntry]:
    offset = (page_number - 1) * page_size
    page_entries = []
    params = [page_size, offset]

    base_query = """
        SELECT q.id, q.text, a.name as author_name, a.id as author_id
        FROM quote q
        JOIN author a ON q.author_id = a.id
    """

    where_clauses = ["q.is_public = TRUE"]
    if author_id is not None:
        where_clauses.append("q.author_id = %s")
        params.insert(0, author_id)

    if where_clauses:
        base_query += " WHERE " + " AND ".join(where_clauses)

    base_query += " ORDER BY q.created_at DESC LIMIT %s OFFSET %s"

    with conn.cursor() as cur:
        cur.execute(base_query, tuple(params))
        quotes_data = cur.fetchall()

    for row in quotes_data:
        quote_id, text, author_name_str, author_id_int = row
        tags = get_tags_for_quote(conn, quote_id)
        tag_names = [tag.name for tag in tags]

        favorite_count = get_quote_favorite_count(conn, quote_id)
        is_favorited_status = False
        if current_user_id:
            is_favorited_status = is_quote_favorited_by_user(
                conn, current_user_id, quote_id
            )

        page_entries.append(
            model.QuotePageEntry(
                id=quote_id,
                text=text,
                author=author_name_str,
                authorName=author_name_str,
                authorId=author_id_int,
                tags=tag_names,
                isFavorited=is_favorited_status,
                favoriteCount=favorite_count,
            )
        )
    return page_entries


def get_quotes_total_pages(
    conn: Connection, page_size: int, author_id: Optional[int] = None
) -> int:
    with conn.cursor() as cur:
        base_query = "SELECT COUNT(*) FROM quote q"
        params = []

        where_clauses = ["q.is_public = TRUE"]
        if author_id is not None:
            where_clauses.append("q.author_id = %s")
            params.append(author_id)

        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)

        cur.execute(base_query, tuple(params))
        response = cur.fetchone()
        if response is None or response[0] is None:
            return 0
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
    conn: Connection, collection_id: int, current_user_id: Optional[int] = None
) -> model.Collection | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT c.id, c.author_id, a.name as author_name, c.name, c.description, c.is_public, c.created_at, c.updated_at "
            "FROM collection c JOIN author a ON c.author_id = a.id "
            "WHERE c.id = %s",
            (collection_id,),
        )
        row = cur.fetchone()
        if row is None:
            return None

        cur.execute(
            "SELECT COUNT(*) FROM collectioncontains WHERE collection_id = %s",
            (collection_id,),
        )
        quote_count_row = cur.fetchone()
        quote_count = quote_count_row[0] if quote_count_row else 0

        quotes_in_collection = get_quote_page_entries_for_collection(
            conn, collection_id, current_user_id
        )

        return model.Collection(
            id=row[0],
            author_id=row[1],
            author_name=row[2],
            name=row[3],
            description=row[4],
            is_public=row[5],
            created_at=row[6],
            updated_at=row[7],
            quote_count=quote_count,
            quotes=quotes_in_collection,
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
                "INSERT INTO collectioncontains (quote_id, collection_id, added_at) VALUES (%s, %s, NOW()) RETURNING quote_id, collection_id, added_at",
                (quote_id, collection_id),
            )
            response = cur.fetchone()
            if response is None:
                raise ValueError(
                    "Failed to add quote to collection, INSERT returned no IDs."
                )
            conn.commit()
            return model.CollectionQuoteLink(
                quote_id=response[0],
                collection_id=response[1],
                added_at=response[2],
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
    collections = []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT c.id, c.author_id, a.name as author_name, c.name, c.description, c.is_public "
            "FROM collection c JOIN author a ON c.author_id = a.id "
            "WHERE c.author_id = %s ORDER BY c.name",
            (author_id,),
        )
        for row in cur.fetchall():
            collection_id = row[0]
            cur.execute(
                "SELECT COUNT(*) FROM collectioncontains WHERE collection_id = %s",
                (collection_id,),
            )
            quote_count_row = cur.fetchone()
            quote_count = quote_count_row[0] if quote_count_row else 0

            collections.append(
                model.Collection(
                    id=collection_id,
                    author_id=row[1],
                    author_name=row[2],
                    name=row[3],
                    description=row[4],
                    is_public=row[5],
                    quote_count=quote_count,
                )
            )
    return collections


def create_tag(conn: Connection, query: model.CreateTagQuery) -> model.Tag:
    response = conn.execute(
        "INSERT INTO tag (name) VALUES (%s) RETURNING id", (query.name,)
    ).fetchone()
    if response is None:
        raise ValueError(f"Could not create tag with name {query.name}")
    return model.Tag(id=response[0], name=query.name)


def get_tag_by_id(conn: Connection, tag_id: int) -> model.Tag | None:
    response = conn.execute(
        "SELECT name FROM tag WHERE id = %s", (tag_id,)
    ).fetchone()
    if response is None:
        return None
    return model.Tag(id=tag_id, name=response[0])


def get_tag_by_name(conn: Connection, tag_name: str) -> model.Tag | None:
    response = conn.execute(
        "SELECT id, name FROM tag WHERE name = %s", (tag_name,)
    ).fetchone()
    if response is None:
        return None
    return model.Tag(id=response[0], name=tag_name)


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


def get_all_unique_tags_with_counts(conn: Connection) -> List[model.TagEntry]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT t.name, COUNT(ta.quote_id) as quote_count
            FROM tag t
            JOIN taggedas ta ON t.id = ta.tag_id
            GROUP BY t.id, t.name
            ORDER BY quote_count DESC, t.name ASC;
            """
        )
        tags_data = cur.fetchall()
        return [
            model.TagEntry(name=row[0], quoteCount=row[1]) for row in tags_data
        ]


def search_tags_by_name(
    conn: Connection, search_term: str, limit: int = 20, skip: int = 0
) -> List[model.TagEntry]:
    tag_entries = []

    if not search_term.strip():
        return []

    search_query_param = f"%{search_term.lower()}%"
    params = [search_query_param, limit, skip]

    sql_query = """
        SELECT
            t.name,
            COUNT(ta.quote_id) as quote_count
        FROM tag t
        LEFT JOIN taggedas ta ON t.id = ta.tag_id
        WHERE LOWER(t.name) LIKE %s
        GROUP BY t.id, t.name
        ORDER BY quote_count DESC, t.name ASC
        LIMIT %s OFFSET %s;
    """

    with conn.cursor() as cur:
        cur.execute(sql_query, tuple(params))
        for row in cur.fetchall():
            tag_entries.append(model.TagEntry(name=row[0], quoteCount=row[1]))
    return tag_entries


def link_quote_to_tag(conn: Connection, quote_id: int, tag_id: int) -> None:
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
    current_user_id: Optional[int] = None,
) -> List[model.QuotePageEntry]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT q.id, q.text, a.name as author_name, a.id as author_id, (q.embedding <-> %s::vector) as distance
            FROM quote q
            JOIN author a ON q.author_id = a.id
            WHERE q.is_public = TRUE
            ORDER BY distance
            LIMIT %s OFFSET %s
            """,
            (query_embedding, limit, skip),
        )

        results = []
        for row in cur.fetchall():
            quote_id, text, author_name_str, author_id_int, _ = row
            tags = get_tags_for_quote(conn, quote_id)
            tag_names = [tag.name for tag in tags]

            favorite_count = get_quote_favorite_count(conn, quote_id)
            is_favorited_status = False
            if current_user_id:
                is_favorited_status = is_quote_favorited_by_user(
                    conn, current_user_id, quote_id
                )

            results.append(
                model.QuotePageEntry(
                    id=quote_id,
                    text=text,
                    author=author_name_str,
                    authorName=author_name_str,
                    authorId=author_id_int,
                    tags=tag_names,
                    isFavorited=is_favorited_status,
                    favoriteCount=favorite_count,
                )
            )
    return results


def add_favorite(conn: Connection, user_id: int, quote_id: int) -> None:
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_quote_favorite (user_id, quote_id) VALUES (%s, %s) ON CONFLICT (user_id, quote_id) DO NOTHING",
                (user_id, quote_id),
            )
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise ValueError(
            f"Error adding favorite for user {user_id} on quote {quote_id}: {e}"
        )


def remove_favorite(conn: Connection, user_id: int, quote_id: int) -> None:
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_quote_favorite WHERE user_id = %s AND quote_id = %s",
                (user_id, quote_id),
            )
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise ValueError(
            f"Error removing favorite for user {user_id} on quote {quote_id}: {e}"
        )


def is_quote_favorited_by_user(
    conn: Connection, user_id: int, quote_id: int
) -> bool:
    if not user_id:
        return False
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM user_quote_favorite WHERE user_id = %s AND quote_id = %s",
            (user_id, quote_id),
        )
        return cur.fetchone() is not None


def get_quote_favorite_count(conn: Connection, quote_id: int) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM user_quote_favorite WHERE quote_id = %s",
            (quote_id,),
        )
        count_row = cur.fetchone()
        return count_row[0] if count_row else 0


def search_collections(
    conn: Connection,
    search_term: str,
    limit: int = 10,
    skip: int = 0,
    current_user_id: Optional[int] = None,
) -> List[model.CollectionEntry]:
    collection_entries = []
    params = []

    base_query = """
        SELECT
            c.id, c.name, c.description, c.author_id,
            a.name AS author_name, c.is_public,
            (SELECT COUNT(*) FROM collectioncontains cc WHERE cc.collection_id = c.id) AS quote_count
        FROM collection c
        JOIN author a ON c.author_id = a.id
    """

    where_parts = []

    search_condition_str = (
        "(LOWER(c.name) ~* LOWER(%s) OR LOWER(c.description) ~* LOWER(%s))"
    )

    users_private_collection_condition_str = '(c.author_id = (SELECT author_id FROM "user" WHERE id = %s) AND c.is_public = FALSE)'

    if search_term.strip():
        search_text_param = (
            search_term.strip()
        )  # Use the search term directly as regex pattern
        if current_user_id is not None:
            main_condition = f"(c.is_public = TRUE OR {users_private_collection_condition_str}) AND {search_condition_str}"
            where_parts.append(main_condition)
            params.extend(
                [current_user_id, search_text_param, search_text_param]
            )
        else:
            main_condition = f"(c.is_public = TRUE AND {search_condition_str})"
            where_parts.append(main_condition)
            params.extend([search_text_param, search_text_param])
    else:
        if current_user_id is not None:
            main_condition = f"(c.is_public = TRUE OR {users_private_collection_condition_str})"
            where_parts.append(main_condition)
            params.append(current_user_id)
        else:
            where_parts.append("c.is_public = TRUE")

    final_query = base_query
    if where_parts:
        final_query += " WHERE " + " AND ".join(where_parts)

    final_query += " ORDER BY c.name LIMIT %s OFFSET %s"
    params.extend([limit, skip])

    with conn.cursor() as cur:
        cur.execute(final_query, tuple(params))
        for row in cur.fetchall():
            collection_entries.append(
                model.CollectionEntry(
                    id=row[0],
                    name=row[1],
                    description=row[2],
                    authorId=row[3],
                    authorName=row[4],
                    isPublic=row[5],
                    quoteCount=row[6],
                )
            )
    return collection_entries


def update_collection(
    conn: Connection,
    collection_id: int,
    query: model.UpdateCollectionQuery,
    author_id: int,
) -> model.Collection | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT author_id, name, description, is_public, created_at, updated_at "
            "FROM collection WHERE id = %s",
            (collection_id,),
        )
        collection_row = cur.fetchone()
        if not collection_row:
            return None

        (
            current_author_id,
            current_name,
            current_description,
            current_is_public,
            created_at,
            updated_at,
        ) = collection_row

        if current_author_id != author_id:
            raise ValueError(
                "User is not authorized to update this collection"
            )

        _new_name = query.name if query.name is not None else current_name
        _new_description = (
            query.description
            if query.description is not None
            else current_description
        )
        _new_is_public = (
            query.is_public
            if query.is_public is not None
            else current_is_public
        )

        if query.name is not None and query.name != current_name:
            cur.execute(
                "SELECT id FROM collection WHERE name = %s AND author_id = %s AND id != %s",
                (query.name, author_id, collection_id),
            )
            if cur.fetchone() is not None:
                raise ValueError(
                    f"A collection with the name '{query.name}' already exists for this author."
                )

        update_fields_dict = {}
        if query.name is not None and query.name != current_name:
            update_fields_dict["name"] = query.name
        if (
            query.description is not None
            and query.description != current_description
        ):
            update_fields_dict["description"] = query.description
        if (
            query.is_public is not None
            and query.is_public != current_is_public
        ):
            update_fields_dict["is_public"] = query.is_public

        if not update_fields_dict:
            author_details = get_author_by_id(conn, current_author_id)
            quote_count_result = cur.execute(
                "SELECT COUNT(*) FROM collectioncontains WHERE collection_id = %s",
                (collection_id,),
            ).fetchone()
            quote_count = quote_count_result[0] if quote_count_result else 0
            return model.Collection(
                id=collection_id,
                author_id=current_author_id,
                author_name=author_details.name
                if author_details
                else "Unknown",
                name=current_name,
                description=current_description,
                is_public=current_is_public,
                quote_count=quote_count,
                created_at=created_at,
                updated_at=updated_at,
            )

        update_fields_dict["updated_at"] = "NOW()"

        set_clause_parts = []
        for key in update_fields_dict:
            if key == "updated_at":
                set_clause_parts.append(f"{key} = NOW()")
            else:
                set_clause_parts.append(f"{key} = %({key})s")
        set_clause = ", ".join(set_clause_parts)

        final_params = {
            k: v for k, v in update_fields_dict.items() if k != "updated_at"
        }
        final_params["collection_id"] = collection_id

        sql = f"UPDATE collection SET {set_clause} WHERE id = %(collection_id)s RETURNING updated_at"

        cur.execute(sql, final_params)
        updated_timestamp_row = cur.fetchone()
        conn.commit()

        if updated_timestamp_row:
            return get_collection_by_id(conn, collection_id)
        return None


def delete_collection_by_id(
    conn: Connection, collection_id: int, author_id: int
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT author_id FROM collection WHERE id = %s", (collection_id,)
        )
        collection_author_row = cur.fetchone()
        if not collection_author_row:
            return False

        if collection_author_row[0] != author_id:
            raise ValueError(
                "User is not authorized to delete this collection"
            )

        cur.execute(
            "DELETE FROM collectioncontains WHERE collection_id = %s",
            (collection_id,),
        )

        cur.execute("DELETE FROM collection WHERE id = %s", (collection_id,))
        deleted_row_count = cur.rowcount
        conn.commit()

        return deleted_row_count > 0


def update_quote_with_client_payload(
    conn: Connection,
    quote_id: int,
    payload: model.UpdateQuoteClientPayload,
    user_author_id: int,
) -> model.QuotePageEntry | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT author_id, text, embedding FROM quote WHERE id = %(quote_id)s",
            {"quote_id": quote_id},
        )
        quote_data = cur.fetchone()
        if quote_data is None:
            return None

        original_author_id, original_text, original_embedding = quote_data

        if original_author_id != user_author_id:
            raise ValueError("User not authorized to update this quote.")

        update_fields = {}
        new_author_id = original_author_id
        new_author_name = ""

        if payload.text is not None and payload.text != original_text:
            update_fields["text"] = payload.text
            update_fields["embedding"] = embedding.generate_embedding(
                payload.text
            )
        else:
            update_fields["embedding"] = original_embedding

        if payload.authorName is not None:
            new_author_obj = get_or_create_author_by_name(
                conn, payload.authorName
            )
            if new_author_obj.id != original_author_id:
                update_fields["author_id"] = new_author_obj.id
            new_author_id = new_author_obj.id
            new_author_name = new_author_obj.name
        else:
            original_author_obj = get_author_by_id(conn, original_author_id)
            if original_author_obj:
                new_author_name = original_author_obj.name
            else:
                new_author_name = "Unknown"

        if not update_fields and payload.tags is None:
            pass
        elif update_fields:
            set_clause_parts = []
            if "text" in update_fields:
                set_clause_parts.append("text = %(text)s")
                set_clause_parts.append("embedding = %(embedding)s")
            if "author_id" in update_fields:
                set_clause_parts.append("author_id = %(author_id)s")

            if set_clause_parts:
                set_clause_parts.append("updated_at = NOW()")
                set_clause = ", ".join(set_clause_parts)

                execute_params = {
                    k: v
                    for k, v in update_fields.items()
                    if k in ["text", "embedding", "author_id"]
                }
                execute_params["quote_id"] = quote_id

                cur.execute(
                    f"UPDATE quote SET {set_clause} WHERE id = %(quote_id)s",
                    execute_params,
                )

        updated_tag_names: List[str] = []
        if payload.tags is not None:
            cur.execute(
                "DELETE FROM taggedas WHERE quote_id = %(quote_id)s",
                {"quote_id": quote_id},
            )

            if payload.tags:
                for tag_name in payload.tags:
                    if tag_name.strip():
                        try:
                            tag_obj = get_or_create_tag(conn, tag_name.strip())
                            link_quote_to_tag(conn, quote_id, tag_obj.id)
                            updated_tag_names.append(tag_obj.name)
                        except ValueError as ve:
                            print(
                                f"Skipping tag '{tag_name}' during update due to error: {ve}"
                            )
        else:
            existing_tags = get_tags_for_quote(conn, quote_id)
            updated_tag_names = [t.name for t in existing_tags]

        conn.commit()

        is_faved = is_quote_favorited_by_user(conn, user_author_id, quote_id)
        fav_count = get_quote_favorite_count(conn, quote_id)

        final_text = update_fields.get("text", original_text)
        final_author_id = new_author_id
        final_author_name = new_author_name

        return model.QuotePageEntry(
            id=quote_id,
            text=final_text,
            authorId=final_author_id,
            authorName=final_author_name,
            tags=updated_tag_names,
            isFavorited=is_faved,
            favoriteCount=fav_count,
        )


def delete_quote_for_user(
    conn: Connection, quote_id: int, user_author_id: int
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT author_id FROM quote WHERE id = %(quote_id)s",
            {"quote_id": quote_id},
        )
        quote_data = cur.fetchone()
        if quote_data is None:
            return False

        original_author_id = quote_data[0]

        if original_author_id != user_author_id:
            raise ValueError("User not authorized to delete this quote.")

        cur.execute(
            "DELETE FROM taggedas WHERE quote_id = %(quote_id)s",
            {"quote_id": quote_id},
        )
        cur.execute(
            "DELETE FROM user_quote_favorite WHERE quote_id = %(quote_id)s",
            {"quote_id": quote_id},
        )
        cur.execute(
            "DELETE FROM collectioncontains WHERE quote_id = %(quote_id)s",
            {"quote_id": quote_id},
        )

        cur.execute(
            "DELETE FROM quote WHERE id = %(quote_id)s", {"quote_id": quote_id}
        )

        conn.commit()
        return cur.rowcount > 0


def get_authors_paginated(
    conn: Connection, search_term: Optional[str], limit: int, skip: int
) -> model.PaginatedAuthorsResponse:
    with conn.cursor() as cur:
        query_conditions = []
        params = []

        if search_term:
            query_conditions.append("name ILIKE %s")
            params.append(f"%{search_term}%")

        where_clause = (
            " WHERE " + " AND ".join(query_conditions)
            if query_conditions
            else ""
        )

        # Get total count
        cur.execute(
            f"SELECT COUNT(*) FROM author{where_clause}", tuple(params)
        )
        total_items = cur.fetchone()[0]
        total_pages = math.ceil(total_items / limit) if limit > 0 else 0

        # Get paginated authors
        limit_clause = " LIMIT %s OFFSET %s"
        params.extend([limit, skip])
        cur.execute(
            f"SELECT id, name FROM author{where_clause} ORDER BY name ASC{limit_clause}",
            tuple(params),
        )
        author_rows = cur.fetchall()

        authors = [
            model.AuthorEntry(id=row[0], name=row[1]) for row in author_rows
        ]

        return model.PaginatedAuthorsResponse(
            authors=authors,
            total_pages=total_pages,
            current_page=math.ceil((skip + 1) / limit) if limit > 0 else 0,
            total_items=total_items,
        )


def _map_row_to_quote_page_entry(
    conn: Connection, row: tuple, current_user_id: Optional[int] = None
) -> model.QuotePageEntry:
    quote_id, author_id_val, text, is_public, _, created_at, updated_at = row[
        :7
    ]

    author = get_author_by_id(conn, author_id_val)
    author_name = author.name if author else "Unknown Author"

    tags_for_quote = get_tags_for_quote(conn, quote_id)
    tag_names = [tag.name for tag in tags_for_quote]

    is_favorited_status = False
    fav_count = 0
    if current_user_id:
        is_favorited_status = is_quote_favorited_by_user(
            conn, user_id=current_user_id, quote_id=quote_id
        )
    fav_count = get_quote_favorite_count(conn, quote_id=quote_id)

    return model.QuotePageEntry(
        id=quote_id,
        text=text,
        author=author_name,
        authorId=author_id_val,
        authorName=author_name,
        tags=tag_names,
        isFavorited=is_favorited_status,
        favoriteCount=fav_count,
    )


def get_quote_page_entries_for_collection(
    conn: Connection, collection_id: int, current_user_id: Optional[int] = None
) -> List[model.QuotePageEntry]:
    quote_entries = []
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT q.id, q.author_id, q.text, q.is_public, q.embedding, q.created_at, q.updated_at
            FROM quote q
            JOIN collectioncontains cc ON q.id = cc.quote_id
            WHERE cc.collection_id = %s
            ORDER BY cc.added_at DESC NULLS LAST, q.created_at DESC;
            """,
            (collection_id,),
        )
        for row in cur.fetchall():
            quote_entries.append(
                _map_row_to_quote_page_entry(conn, row, current_user_id)
            )
    return quote_entries


def user_add_quote_to_collection(
    conn: Connection, user_id: int, quote_id: int, collection_id: int
) -> model.CollectionQuoteLink:
    user = get_user_by_id(conn, user_id)
    if not user or not user.author_id:
        raise ValueError("User not found or user author_id is missing.")

    collection = get_collection_by_id(conn, collection_id)
    if not collection:
        raise ValueError(f"Collection with ID {collection_id} not found.")

    if collection.author_id != user.author_id:
        raise ValueError(
            "User is not authorized to add quotes to this collection."
        )

    return add_quote_to_collection(conn, quote_id, collection_id)


def user_remove_quote_from_collection(
    conn: Connection, user_id: int, quote_id: int, collection_id: int
) -> bool:
    user = get_user_by_id(conn, user_id)
    if not user or not user.author_id:
        raise ValueError("User not found or user author_id is missing.")

    collection = get_collection_by_id(conn, collection_id)
    if not collection:
        raise ValueError(f"Collection with ID {collection_id} not found.")

    if collection.author_id != user.author_id:
        raise ValueError(
            "User is not authorized to remove quotes from this collection."
        )

    return remove_quote_from_collection(conn, quote_id, collection_id)


def remove_quote_from_collection(
    conn: Connection, quote_id: int, collection_id: int
) -> bool:
    with conn.cursor() as cur:
        try:
            cur.execute(
                "DELETE FROM collectioncontains WHERE quote_id = %s AND collection_id = %s",
                (quote_id, collection_id),
            )
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(
                f"Error removing quote {quote_id} from collection {collection_id}: {e}"
            )
            raise ValueError(
                f"Could not remove quote {quote_id} from collection {collection_id}: {e}"
            ) from e
