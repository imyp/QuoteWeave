import app.model as model
import app.security as security
from psycopg.connection import Connection


def create_author(conn: Connection, query: model.CreateAuthorQuery) -> model.Author:
    response = conn.execute(
        "INSERT INTO author (name) VALUES (%s) RETURNING aid", (query.name,)
    ).fetchone()
    if response is None:
        raise ValueError("Failed to create author")
    return model.Author(id=response[0], name=query.name)


def get_author_by_name(conn: Connection, name: str) -> model.Author | None:
    response = conn.execute(
        "SELECT aid, name FROM author WHERE name = %s", (name,)
    ).fetchone()
    if response is None:
        return None
    return model.Author(id=response[0], name=response[1])


def get_author_by_id(conn: Connection, author_id: int) -> model.Author | None:
    response = conn.execute(
        "SELECT aid, name FROM author WHERE aid = %s", (author_id,)
    ).fetchone()
    if response is None:
        return None
    author_id, author_name = response
    return model.Author(id=author_id, name=author_name)


def create_user_from_author(
    conn: Connection, query: model.CreateUserFromAuthorQuery
) -> model.User:
    author = get_author_by_name(conn, query.username)
    if author is None:
        raise ValueError(f"No author found with name: {query.username}")
    conn.execute(
        "INSERT INTO auser (author_id, email, pw) VALUES (%s, %s, %s)",
        (author.id, query.email, query.password),
    )
    return model.User(
        id=author.id,
        username=query.username,
        email=query.email,
        password=query.password,
    )


def create_user(conn: Connection, query: model.CreateUserQuery) -> model.User:
    create_author(conn, model.CreateAuthorQuery(name=query.username))
    hashed_password = security.hash_password(query.password)
    return create_user_from_author(
        conn,
        model.CreateUserFromAuthorQuery(
            username=query.username, email=query.email, password=hashed_password
        ),
    )


def get_user_by_name(conn: Connection, name: str) -> model.User | None:
    response = conn.execute(
        "SELECT auser.author_id, auser.email, auser.pw FROM auser "
        "JOIN author ON auser.author_id = author.aid WHERE author.name = %s",
        (name,),
    ).fetchone()
    if response is None:
        return None
    user_id, email, password = response
    return model.User(id=user_id, username=name, email=email, password=password)


def get_user_by_email(conn: Connection, email: str) -> model.User | None:
    response = conn.execute(
        "SELECT auser.author_id, author.name, auser.pw FROM auser "
        "JOIN author ON auser.author_id = author.aid WHERE auser.email = %s",
        (email,),
    ).fetchone()
    if response is None:
        return None
    user_id, username, password = response
    return model.User(id=user_id, username=username, email=email, password=password)


def get_user_by_id(conn: Connection, user_id: int) -> model.User | None:
    response = conn.execute(
        "SELECT auser.author_id, author.name, auser.email, auser.pw FROM auser "
        "JOIN author ON auser.author_id = author.aid WHERE auser.author_id = %s",
        (user_id,),
    ).fetchone()
    if response is None:
        return None
    user_id, username, email, password = response
    return model.User(id=user_id, username=username, email=email, password=password)


def create_quote(conn: Connection, query: model.CreateQuoteQuery) -> model.Quote:
    response = conn.execute(
        "INSERT INTO quote (author_id, text, is_public) VALUES (%s, %s, %s) RETURNING qid",
        (query.author_id, query.text, query.is_public),
    ).fetchone()
    if response is None:
        raise ValueError("Failed to create quote")
    return model.Quote(
        id=response[0],
        author_id=query.author_id,
        text=query.text,
        is_public=query.is_public,
    )


def get_quote_by_id(conn: Connection, quote_id: int) -> model.Quote | None:
    response = conn.execute(
        "SELECT qid, author_id, text, is_public FROM quote WHERE qid = %s",
        (quote_id,),
    ).fetchone()
    if response is None:
        return None
    quote_id, author_id, text, is_public = response
    return model.Quote(id=quote_id, author_id=author_id, text=text, is_public=is_public)


def get_quotes_by_author(conn: Connection, author: model.Author) -> list[model.Quote]:
    response = conn.execute(
        "SELECT qid, author_id, text, is_public FROM quote WHERE author_id = %s",
        (author.id,),
    ).fetchall()
    return [
        model.Quote(id=row[0], author_id=row[1], text=row[2], is_public=row[3])
        for row in response
    ]


def get_quotes_by_collection(
    conn: Connection, collection: model.Collection
) -> list[model.Quote]:
    response = conn.execute(
        "SELECT qid, quote.aid, quote.text, quote.is_public, cid FROM collectioncontains "
        "JOIN quote ON quote.qid = collectioncontains.qid WHERE cid = %s",
        (collection.id,),
    ).fetchall()
    return [
        model.Quote(id=row[0], author_id=row[1], text=row[2], is_public=row[3])
        for row in response
    ]


def get_quotes_by_tag(conn: Connection, tag: model.Tag) -> list[model.Quote]:
    response = conn.execute(
        "SELECT qid, quote.aid, quote.text, quote.is_public, tid from taggedas "
        "JOIN quote on quote.qid = taggedas.qid WHERE tid = %s",
        (tag.id,),
    ).fetchall()
    return [
        model.Quote(id=row[0], author_id=row[1], text=row[2], is_public=row[3])
        for row in response
    ]


def create_collection(
    conn: Connection, query: model.CreateCollectionQuery
) -> model.Collection:
    response = conn.execute(
        "INSERT INTO collection (aid, name, description, is_public) "
        "VALUES (%s, %s, %s, %s) RETURNING cid",
        (query.user_id, query.name, query.description, query.is_public),
    ).fetchone()
    if response is None:
        raise ValueError("Failed to create collection")
    return model.Collection(
        id=response[0],
        user_id=query.user_id,
        name=query.name,
        description=query.description,
        is_public=query.is_public,
    )


def get_collection_by_id(
    conn: Connection, collection_id: int
) -> model.Collection | None:
    response = conn.execute(
        "SELECT cid, aid, name, description, is_public FROM collection WHERE cid = %s",
        (collection_id,),
    ).fetchone()
    if response is None:
        return None
    collection_id, user_id, name, description, is_public = response
    return model.Collection(
        id=collection_id,
        user_id=user_id,
        name=name,
        description=description,
        is_public=is_public,
    )

def get_collection_by_name(conn: Connection, name: str) -> model.Collection | None:
    response = conn.execute(
        "SELECT cid, aid, name, description, is_public FROM collection WHERE name = %s",
        (name,)
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
    conn: Connection, quote: model.Quote, collection: model.Collection
) -> model.CollectionQuoteLink:
    response = conn.execute(
        "INSERT INTO collectioncontains (cid, qid) "
        "VALUES (%s, %s) RETURNING cid, qid",
        (collection.id, quote.id),
    ).fetchone()
    if response is None:
        raise ValueError("Could not add link")
    cid, qid = response
    return model.CollectionQuoteLink(collection_id=cid, quote_id=qid)


def get_collections_from_author(
    conn: Connection, author: model.Author
) -> list[model.Collection]:
    response = conn.execute(
        "SELECT cid, aid, name, description, is_public FROM collection WHERE aid = %s",
        (author.id,),
    ).fetchall()
    return [
        model.Collection(
            id=row[0],
            user_id=author.id,
            name=row[2],
            description=row[3],
            is_public=row[4],
        )
        for row in response
    ]


def create_tag(conn: Connection, query: model.CreateTagQuery) -> model.Tag:
    response = conn.execute(
        "INSERT INTO tag (name) VALUES (%s) RETURNING tid", (query.name,)
    ).fetchone()
    if response is None:
        raise ValueError(f"Could not create tag with name {query.name}")
    return model.Tag(id=response[0], name=query.name)


def get_tag_by_id(conn: Connection, tag_id: int) -> model.Tag | None:
    response = conn.execute("SELECT name FROM tag WHERE tid = %s", (tag_id,)).fetchone()
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

def add_tag_to_quote(conn: Connection, tag: model.Tag, quote: model.Quote) -> model.TagQuoteLink:
    response = conn.execute(
        "INSERT INTO taggedas (tid, qid) VALUES (%s, %s) RETURNING tid, qid",
        (tag.id, quote.id)
    ).fetchone()
    if response is None:
        raise ValueError("Could not add tag to quote.")
    return model.TagQuoteLink(tag_id=response[0], quote_id=response[1])
