from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CreateAuthorQuery(BaseModel):
    name: str


class Author(BaseModel):
    id: int
    name: str


class CreateUserFromAuthorQuery(BaseModel):
    username: str
    email: str
    password: str


class CreateUserQuery(BaseModel):
    username: str
    email: str
    password: str


class User(BaseModel):
    id: int
    author_id: int
    username: str
    email: str
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str


class UserIdResponse(BaseModel):
    id: int


class UserNameQuery(BaseModel):
    username: str


class ValidationResponse(BaseModel):
    valid: bool


class Tag(BaseModel):
    id: int
    name: str


class CreateTagQuery(BaseModel):
    name: str


class CreateQuoteQuery(BaseModel):
    author_id: int
    text: str
    is_public: bool


class Quote(BaseModel):
    id: int
    author_id: int
    text: str
    is_public: bool
    embedding: Optional[List[float]] = None
    tags: List[Tag] = []
    created_at: datetime
    updated_at: datetime


class QuoteSimple(BaseModel):
    id: int
    text: str
    tags: List[Tag] = []


class QuoteCollection(BaseModel):
    quotes: List[Quote]


class CreateCollectionQuery(BaseModel):
    author_id: int
    name: str
    description: str
    is_public: bool


class Collection(BaseModel):
    id: int
    author_id: int
    name: str
    description: str
    is_public: bool


class CollectionSimple(BaseModel):
    id: int
    name: str


class CollectionQuoteLink(BaseModel):
    quote_id: int
    collection_id: int


class TagQuoteLink(BaseModel):
    tag_id: int
    quote_id: int


class QuotePageEntry(BaseModel):
    id: int
    text: str
    is_public: bool
    author_id: int
    author_name: str
    tags: List[Tag] = []
    created_at: datetime
    updated_at: datetime


class QuotePageResponse(BaseModel):
    quotes: List[QuotePageEntry]


class QuotesTotalPagesResponse(BaseModel):
    n_pages: int


class AuthorResponse(BaseModel):
    id: int
    name: str
    quotes: List[QuoteSimple]
    collections: List[CollectionSimple]
