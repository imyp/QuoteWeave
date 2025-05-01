import jwt
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str


SECRET_KEY = "afd07831a38492b037b1894824f2da573487e00e36c030699f6d065a1b8319fa"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode(encoding="utf-8"), hashed_password.encode(encoding="utf-8"))

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(encoding="utf-8"), salt).decode("utf-8")

def create_access_token(data: dict[str, Any], expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def jwt_decode(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
