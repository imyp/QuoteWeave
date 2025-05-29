from datetime import timedelta
from typing import Annotated, List

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from psycopg import Connection
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

import app.crud as crud
import app.db as db
import app.embedding as embedding
import app.model as model
import app.security as security
import app.tagging as tagging

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]
ConnectionDep = Annotated[Connection, Depends(db.get_connection_gen)]
PasswordFormDep = Annotated[OAuth2PasswordRequestForm, Depends()]


async def get_current_user(conn: ConnectionDep, token: TokenDep) -> model.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt_decode(token)
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    user = crud.get_user_by_name(conn, username)
    if user is None:
        raise credentials_exception
    return user


CurrentUserDep = Annotated[model.User, Depends(get_current_user)]


async def get_current_active_user(
    current_user_internal: CurrentUserDep,
) -> model.UserResponse:
    if not current_user_internal.username:
        raise HTTPException(
            status_code=500, detail="Username missing in current user data."
        )
    return model.UserResponse(
        id=current_user_internal.id,
        username=current_user_internal.username,
        email=current_user_internal.email,
    )


CurrentUserResponseDep = Annotated[
    model.UserResponse, Depends(get_current_active_user)
]

app = FastAPI()


@app.on_event("startup")
async def startup_event():
    print("Application startup...")
    # Tagging model is lazy-loaded by tagging.py
    # Embedding model is lazy-loaded by embedding.py
    # Explicitly load them here if desired for immediate availability / error checking at start
    # tagging.load_model() # Already lazy-loaded
    # embedding.load_embedding_model() # Already lazy-loaded
    print("ML models are configured for lazy loading.")


class TaggingRequest(BaseModel):
    quote: str
    author: str


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/token")
async def login_for_access_token(
    conn: ConnectionDep, form_data: PasswordFormDep
):
    user = crud.get_user_by_name(conn, form_data.username)
    if user is None or user.password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not security.check_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    acces_token_expires = timedelta(
        minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    acces_token = security.create_access_token(
        data={"sub": form_data.username}, expires_delta=acces_token_expires
    )
    return security.Token(access_token=acces_token, token_type="bearer")


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/users/create", response_model=model.UserResponse)
async def create_new_user(conn: ConnectionDep, query: model.CreateUserQuery):
    try:
        user_response = crud.create_user(conn, query)
        return user_response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get(
    "/users/check-valid-username", response_model=model.ValidationResponse
)
async def check_if_username_is_valid(
    conn: ConnectionDep, query: model.UserNameQuery
):
    author = crud.get_author_by_name(conn, query.username)
    return model.ValidationResponse(valid=author is None)


@app.get("/users/me", response_model=model.UserResponse)
async def current_user_endpoint(current_user_resp: CurrentUserResponseDep):
    return current_user_resp


@app.get("/quotes/page/{page_number}", response_model=model.QuotePageResponse)
async def get_quotes_page(conn: ConnectionDep, page_number: int):
    quotes = crud.get_quotes_for_page(conn, 20, page_number)
    return model.QuotePageResponse(quotes=quotes)


@app.get("/quotes/get-n-pages", response_model=model.QuotesTotalPagesResponse)
async def get_quotes_total_pages(conn: ConnectionDep):
    n_pages = crud.get_quotes_total_pages(conn, 20)
    return model.QuotesTotalPagesResponse(n_pages=n_pages)


@app.get("/quotes/me", response_model=model.QuoteCollection)
async def current_quotes(conn: ConnectionDep, current_user: CurrentUserDep):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=403, detail="User not associated with an author."
        )
    quotes = crud.get_quotes_by_author(conn, current_user.author_id)
    return model.QuoteCollection(quotes=quotes)


@app.post("/quotes/create", response_model=model.Quote)
async def create_quote(
    conn: ConnectionDep,
    current_user_dep: CurrentUserDep,
    quote_content: str = Query(
        ..., min_length=1, description="Content of the quote"
    ),
):
    if current_user_dep.author_id is None:
        raise HTTPException(
            status_code=403,
            detail="User not associated with an author to create a quote.",
        )

    author = crud.get_author_by_id(conn, current_user_dep.author_id)
    if not author:
        raise HTTPException(
            status_code=404, detail="Author for current user not found."
        )

    query = model.CreateQuoteQuery(
        author_id=current_user_dep.author_id,
        text=quote_content,
        is_public=True,
    )
    new_quote = crud.create_quote(conn, query, author_name=author.name)
    return new_quote


@app.get("/authors/{author_id}")
async def get_author_info(conn: ConnectionDep, author_id: int):
    author = crud.get_author_by_id(conn, author_id)
    if author is None:
        raise HTTPException(
            status_code=404, detail=f"No author with id: {author_id}."
        )
    qs = crud.get_quotes_by_author(conn, author_id)
    cs = crud.get_collections_from_author(conn, author_id)

    simple_quotes = [
        model.QuoteSimple(id=q.id, text=q.text, tags=q.tags) for q in qs
    ]
    simple_collections = [
        model.CollectionSimple(id=c.id, name=c.name) for c in cs
    ]

    return model.AuthorResponse(
        id=author.id,
        name=author.name,
        quotes=simple_quotes,
        collections=simple_collections,
    )


@app.post("/tags/", response_model=List[str])
async def generate_tags_endpoint(request: TaggingRequest):
    if not request.quote or not request.author:
        raise HTTPException(
            status_code=400,
            detail="Both 'quote' and 'author' must be provided.",
        )
    try:
        input_text = tagging.create_input_text(request.quote, request.author)
        tags = tagging.predict_tags(input_text)
        return tags
    except RuntimeError as e:
        raise HTTPException(
            status_code=503, detail=f"Tagging service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during tag prediction: {str(e)}"
        )


@app.get("/quotes/search/", response_model=List[model.QuotePageEntry])
async def search_quotes_endpoint(
    conn: ConnectionDep,
    query: str = Query(
        ...,
        min_length=1,
        description="Text to search for semantically similar quotes",
    ),
    limit: int = Query(
        10, gt=0, le=100, description="Number of results to return"
    ),
    skip: int = Query(
        0, ge=0, description="Number of results to skip for pagination"
    ),
):
    if not query.strip():
        raise HTTPException(
            status_code=400, detail="Search query cannot be empty."
        )
    try:
        query_embedding = embedding.generate_embedding(query)
        quotes = crud.search_quotes_semantic(
            conn, query_embedding, limit=limit, skip=skip
        )
        return quotes
    except Exception as e:
        # Log the exception e
        raise HTTPException(
            status_code=500, detail=f"Error during semantic search: {str(e)}"
        )
