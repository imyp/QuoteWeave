import ast
import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

# Define password constraints for reusability
PASSWORD_DESCRIPTION = "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a digit, and a special character (@$!%*?&)."
ALLOWED_PASSWORD_SPECIAL_CHARS = "@$!%*?&"
ALLOWED_PASSWORD_CHARS_REGEX = r"^[A-Za-z0-9@$!%*?&]+$"


def _validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[a-z]", v):
        raise ValueError(
            "Password must include at least one lowercase letter."
        )
    if not re.search(r"[A-Z]", v):
        raise ValueError(
            "Password must include at least one uppercase letter."
        )
    if not re.search(r"[0-9]", v):  # Changed from r"\\d"
        raise ValueError("Password must include at least one digit.")
    if not re.search(f"[{re.escape(ALLOWED_PASSWORD_SPECIAL_CHARS)}]", v):
        raise ValueError(
            f"Password must include at least one special character: {ALLOWED_PASSWORD_SPECIAL_CHARS}"
        )
    if not re.fullmatch(ALLOWED_PASSWORD_CHARS_REGEX, v):
        raise ValueError(
            f"Password contains invalid characters. Only alphanumeric and these special characters are allowed: {ALLOWED_PASSWORD_SPECIAL_CHARS}"
        )
    return v


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
    username: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9_]{3,20}$",
        description="Username must be 3-20 characters long and can only contain alphanumeric characters and underscores.",
    )
    email: str = Field(
        ...,
        pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        description="Must be a valid email address.",
    )
    password: str = Field(
        ...,
        description=PASSWORD_DESCRIPTION,
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class User(BaseModel):
    id: int
    author_id: Optional[int] = None
    username: str
    email: str
    password: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None


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


class TagEntry(BaseModel):
    name: str
    quoteCount: int


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
    isFavorited: Optional[bool] = None
    favoriteCount: int = 0


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
    author_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    is_public: bool
    quote_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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
    author: str
    authorId: Optional[int] = None
    authorName: Optional[str] = None
    tags: List[str]
    isFavorited: Optional[bool] = None
    favoriteCount: int = 0


class QuotePageResponse(BaseModel):
    quotes: List[QuotePageEntry]
    totalPages: int


class QuotesTotalPagesResponse(BaseModel):
    n_pages: int


class AuthorResponse(BaseModel):
    id: int
    name: str
    quotes: List[QuoteSimple]
    collections: List[CollectionSimple]


# Model for collection search results
class CollectionEntry(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    authorId: int
    authorName: str
    isPublic: bool
    quoteCount: int


# New model for quotes from CSV
class CSVMockQuote(BaseModel):
    model_config = {"populate_by_name": True, "coerce_numbers_to_str": True}

    id_field: Optional[int] = Field(None, alias="ID")
    quote_field: str = Field(alias="quote")
    author_field: str = Field(alias="author")
    tags: List[str] = Field(default_factory=list, alias="category")
    popularity_field: Optional[float] = Field(None, alias="Popularity")

    @field_validator("tags", mode="before")
    def parse_tags_from_string(cls, v):
        if isinstance(v, list):
            return v
        if not isinstance(v, str) or not v.strip():
            return []

        v_stripped = v.strip()
        if v_stripped.startswith("[") and v_stripped.endswith("]"):
            try:
                parsed_list = ast.literal_eval(v_stripped)
                if isinstance(parsed_list, list):
                    return [
                        str(tag).strip()
                        for tag in parsed_list
                        if str(tag).strip()
                    ]
            except (ValueError, SyntaxError):
                pass

        return [tag.strip() for tag in v_stripped.split(",") if tag.strip()]

    @property
    def ID(self) -> Optional[int]:
        return self.id_field

    @property
    def Quote(self) -> str:
        return self.quote_field

    @property
    def Author(self) -> str:
        return self.author_field

    @property
    def Category(self) -> Optional[str]:
        return str(self.tags) if self.tags else None

    @property
    def Popularity(self) -> Optional[float]:
        return self.popularity_field


# Payload for creating a collection from the client (author_id will be derived from authenticated user)
class CreateCollectionClientPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field("", max_length=500)
    is_public: bool = False


class UpdateCollectionQuery(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


# Payloads for client-side quote creation and updates
class CreateQuoteClientPayload(BaseModel):
    text: str = Field(..., min_length=1)
    authorName: str = Field(..., min_length=1)
    tags: List[str] = Field(default_factory=list)

    @field_validator("tags")
    def validate_tags(cls, v):
        if len(v) > 7:
            raise ValueError("A maximum of 7 tags are allowed.")
        # Further tag validation (e.g., length, characters) can be added here
        return v


class UpdateQuoteClientPayload(BaseModel):
    text: Optional[str] = Field(None, min_length=1)
    authorName: Optional[str] = Field(None, min_length=1)
    tags: Optional[List[str]] = (
        None  # Allow setting tags to empty list or new list
    )

    @field_validator("tags")
    def validate_tags_optional(cls, v):
        if v is not None and len(v) > 7:
            raise ValueError("A maximum of 7 tags are allowed.")
        return v


class UpdateUserProfilePayload(BaseModel):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    username: Optional[str] = Field(
        None, min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]{3,20}$"
    )
    email: Optional[str] = Field(
        None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    )


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str = Field(
        ...,
        description=PASSWORD_DESCRIPTION,
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password_strength(v)
