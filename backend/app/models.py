from pydantic import BaseModel

class User(BaseModel):
    id: int
    username: str
    password: str

class Quote(BaseModel):
    id: int
    user_id: int
    content: str