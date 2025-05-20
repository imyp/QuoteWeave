from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import bcrypt
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str


SECRET_KEY = "afd07831a38492b037b1894824f2da573487e00e36c030699f6d065a1b8319fa"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    password_bytes = password.encode('utf-8')
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    hashed_password = hashed_bytes.decode('utf-8')
    return hashed_password

def check_password(plain_password: str, hashed_password: str) -> bool:
    plain_password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)


def create_access_token(data: dict[str, Any], expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM) # pyright: ignore[reportUnknownMemberType]
    return encoded_jwt

def jwt_decode(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) # pyright: ignore[reportUnknownMemberType]
