import csv
import typing

from psycopg.connection import Connection

import app.db as db
import app.crud as crud
import app.model as model


class Entry(typing.TypedDict):
    quote: str
    author: str
    collection: str | None
    tags: list[str]


def extract_samples_from_file(filename: str, n: int) -> list[Entry]:
    entries: list[Entry] = []
    with open(filename, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for _, row in zip(range(n), reader):
            quote = row["quote"]
            tags = [s.strip() for s in row["category"].split(",")]
            author_section = row["author"].split(",")
            author_section_len = len(author_section)
            if author_section_len == 1:
                author = author_section[0]
                collection = None
            elif author_section_len == 2:
                author = author_section[0]
                collection = author_section[1].strip()
            else:
                author = author_section[0]
                collection = ",".join(author_section[1:]).strip()
            if author == "":
                author = "Unknown"
            entry = Entry(quote=quote, author=author, collection=collection, tags=tags)
            entries.append(entry)
    if len(entries) != n:
        raise ValueError(f"Tried to extract {n} entries, only found {len(entries)}")
    return entries

def add_entry_to_db(conn: Connection, entry: Entry):
    print(f"Adding entry {entry}")
    author = crud.get_author_by_name(conn, entry["author"])
    if author is None:
        author_query = model.CreateAuthorQuery(name=entry["author"])
        author = crud.create_author(conn, author_query)
        conn.commit()
    quote_query = model.CreateQuoteQuery(author_id=author.id, text=entry["quote"], is_public=True)
    quote = crud.create_quote(conn, quote_query)
    conn.commit()
    for tag_name in entry["tags"]:
        tag = crud.get_tag_by_name(conn, tag_name)
        if tag is None:
            tag_query = model.CreateTagQuery(name=tag_name)
            tag = crud.create_tag(conn, tag_query)
            conn.commit()
        crud.add_tag_to_quote(conn, tag, quote)
        conn.commit()
    if entry["collection"] is not None:
        collection = crud.get_collection_by_name(conn, entry["collection"])
        if collection is None:
            collection_query = model.CreateCollectionQuery(
                user_id=author.id,
                name=entry["collection"],
                description="",
                is_public=True
            )
            collection = crud.create_collection(conn, collection_query)
            conn.commit()
        crud.add_quote_to_collection(conn, quote, collection)
        conn.commit()

def populate_if_necessary(conn: Connection, filename: str, n: int):
    """Populate database with data from file if database contains no quotes."""
    response = conn.execute("SELECT COUNT(*) FROM quote;").fetchone()
    if response is None:
        raise ValueError("Not able to count entries.")
    if response[0] > 0:
        print("Quotes were found in the table so database will not be populated.")
        return None
    print("Extracting entries from file.")
    entries = extract_samples_from_file(filename, n)
    print("Writing entries to database.")
    with db.get_connection() as conn:
        for entry in entries:
            add_entry_to_db(conn, entry)
    print("Done.")
