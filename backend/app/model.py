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
    username: str
    email: str
    password: str

class UserIdResponse(BaseModel):
    id: int

class UserNameQuery(BaseModel):
    username: str

class ValidationResponse(BaseModel):
    valid: bool

class CreateQuoteQuery(BaseModel):
    author_id: int
    text: str
    is_public: bool

class Quote(BaseModel):
    id: int
    author_id: int
    text: str
    is_public: bool

class QuoteCollection(BaseModel):
    quotes: list[Quote]

class CreateCollectionQuery(BaseModel):
    user_id: int
    name: str
    description: str
    is_public: bool

class Collection(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    is_public: bool

class CollectionQuoteLink(BaseModel):
    quote_id: int
    collection_id: int

class CreateTagQuery(BaseModel):
    name: str

class Tag(BaseModel):
    id: int
    name: str

class TagQuoteLink(BaseModel):
    tag_id: int
    quote_id: int

class QuotePageEntry(BaseModel):
    quote_id: int
    quote_text: str
    quote_is_public: bool
    author_id: int
    author_name: str


class QuotePageResponse(BaseModel):
    quotes: list[QuotePageEntry]

class QuotesTotalPagesResponse(BaseModel):
    n_pages: int