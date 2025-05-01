import app.models as models
from psycopg import Connection


def get_user_by_username(conn: Connection, username: str):
    with conn.cursor() as cur:
        cur.execute("SELECT id, username, password FROM user_ WHERE username=%s;", (username,))
        result = cur.fetchone()
        if result is None:
            return None
        return models.User(id=result[0], username=result[1], password=result[2])

def create_quote_by_user_id(conn: Connection, user_id: int, quote_text: str):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO quote_ (user_id, content) VALUES (%s, %s) RETURNING id", (user_id, quote_text))
        quote_id_tuple = cur.fetchone()
        conn.commit()
    if quote_id_tuple is None:
        return None
    return models.Quote(id=quote_id_tuple[0], user_id=user_id, content=quote_text)

def get_quotes_by_user(conn: Connection, user: models.User):
    with conn.cursor() as cur:
        cur.execute("SELECT id, user_id, content FROM quote_ WHERE user_id=%s", (user.id,))
        quote_tuples = cur.fetchall()
    return [models.Quote(id=q[0], user_id=q[1], content=q[2]) for q in quote_tuples]

def get_all_quotes(conn: Connection):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM quote_")
        quotes = cur.fetchall()
    return [models.Quote(id=q[0], user_id=q[1], content=q[2]) for q in quotes]

def add_user(conn: Connection, username: str, hashed_password: str):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO user_ (username, password) VALUES (%s, %s) RETURNING id", (username, hashed_password))
        user_id_tuple = cur.fetchone()
        conn.commit()
    if user_id_tuple is None:
        return None
    return models.User(id=user_id_tuple[0], username=username, password=hashed_password)