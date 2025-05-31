import math
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Annotated, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from psycopg import Connection
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

import app.crud as crud
import app.db as db
import app.embedding as embedding
import app.model as model
import app.security as security
import app.tagging as tagging

# Load environment variables from .env file
# This should be one of the first things your application does.
load_dotenv()

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
    except InvalidTokenError as e:
        raise credentials_exception
    user = crud.get_user_by_name(conn, username)
    if user is None:
        raise credentials_exception
    return user


CurrentUserDep = Annotated[model.User, Depends(get_current_user)]


async def get_optional_current_user(
    request: Request,
    conn: ConnectionDep,
    token_from_dep: Optional[TokenDep] = None,
) -> Optional[model.User]:
    actual_token: Optional[str] = token_from_dep
    print(
        f"[get_optional_current_user] Token from dependency: {'present' if actual_token else actual_token}"
    )

    if not actual_token:
        auth_header = request.headers.get("authorization")
        print(
            f"[get_optional_current_user] Manually read 'authorization' header: {auth_header}"
        )
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                actual_token = parts[1]
                print(
                    f"[get_optional_current_user] Manually extracted token: {'present' if actual_token else 'error in extraction'}"
                )
            else:
                print(
                    f"[get_optional_current_user] 'authorization' header malformed: {auth_header}"
                )

    if actual_token is None:
        print(
            "[get_optional_current_user] No token found (either from dep or manual), returning None."
        )
        return None
    try:
        print(
            "[get_optional_current_user] Attempting to call get_current_user with actual_token."
        )
        user = await get_current_user(conn, actual_token)
        print(
            f"[get_optional_current_user] get_current_user returned: {'user object' if user else 'None'}"
        )
        return user
    except HTTPException as e:
        print(
            f"[get_optional_current_user] HTTPException caught: status={e.status_code}, detail={e.detail}"
        )
        if e.status_code == status.HTTP_401_UNAUTHORIZED:
            print("[get_optional_current_user] Caught 401, returning None.")
            return None
        raise


OptionalCurrentUserDep = Annotated[
    Optional[model.User], Depends(get_optional_current_user)
]


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


# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup via lifespan...")
    try:
        embedding.load_embedding_model()
        print(
            "Embedding model loaded successfully or already available via lifespan."
        )
    except RuntimeError as e:
        print(
            f"Critical error: Could not load embedding model on startup via lifespan: {e}"
        )

    try:
        embedding.load_quotes_and_generate_embeddings()
        print(
            f"Mock quotes processing complete via lifespan. {len(embedding.CSV_QUOTES_DATA)} quotes loaded."
        )
    except Exception as e:
        print(
            f"Warning: Error loading mock quotes or generating embeddings on startup via lifespan: {e}"
        )

    print("Startup via lifespan finished.")
    print(
        "\n=============================\nFINISHED SETUP. READY TO USE\n=============================\n"
    )
    yield
    print("Application shutdown via lifespan...")


app = FastAPI(title="QuoteWeave API", version="0.1.0", lifespan=lifespan)


class TaggingRequest(BaseModel):
    quote: str
    author: str


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/token")
async def login_for_access_token(
    conn: ConnectionDep, form_data: PasswordFormDep
):
    user = crud.get_user_by_name(conn, form_data.username)
    if user is None or user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not security.check_password(form_data.password, user.password_hash):
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


@app.put("/users/me", response_model=model.UserResponse)
async def update_current_user_profile_endpoint(
    conn: ConnectionDep,
    payload: model.UpdateUserProfilePayload,
    current_user: CurrentUserDep,
):
    try:
        updated_user = crud.update_user_profile(conn, current_user.id, payload)
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating profile.",
        )


@app.get(
    "/authors", response_model=model.PaginatedAuthorsResponse, tags=["Authors"]
)
async def list_authors_endpoint(
    conn: ConnectionDep,
    search: Optional[str] = Query(
        None, description="Text to search for in author names."
    ),
    skip: int = Query(
        0, ge=0, description="Number of authors to skip for pagination"
    ),
    limit: int = Query(
        20, gt=0, le=100, description="Number of authors to return"
    ),
):
    try:
        authors_response = crud.get_authors_paginated(
            conn, search_term=search, limit=limit, skip=skip
        )
        return authors_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching authors.",
        )


@app.put("/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    conn: ConnectionDep,
    payload: model.ChangePasswordPayload,
    current_user: CurrentUserDep,
):
    try:
        success = crud.update_user_password(conn, current_user.id, payload)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password could not be updated.",
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    return


@app.put("/users/me/preferences", response_model=model.UserResponse)
async def update_current_user_preferences(
    conn: ConnectionDep,
    payload: model.UpdateUserProfilePayload,
    current_user: CurrentUserDep,
):
    try:
        updated_user_response = crud.update_user_preferences(
            conn, current_user.id, payload
        )
        return updated_user_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )


@app.get("/quotes/page/{page_number}", response_model=model.QuotePageResponse)
async def get_quotes_page(
    conn: ConnectionDep,
    page_number: int,
    current_user: OptionalCurrentUserDep,
    author_id: Optional[int] = Query(
        None, description="Filter quotes by author ID"
    ),
):
    page_size = 9
    quotes = crud.get_quotes_for_page(
        conn,
        page_size,
        page_number,
        current_user.id if current_user else None,
        author_id=author_id,
    )
    total_pages = crud.get_quotes_total_pages(
        conn, page_size, author_id=author_id
    )
    return model.QuotePageResponse(quotes=quotes, totalPages=total_pages)


@app.get("/quotes/get-n-pages", response_model=model.QuotesTotalPagesResponse)
async def get_quotes_total_pages(
    conn: ConnectionDep,
    author_id: Optional[int] = Query(
        None, description="Filter quotes by author ID"
    ),
):
    page_size = 9
    total_pages = crud.get_quotes_total_pages(
        conn, page_size, author_id=author_id
    )
    return model.QuotesTotalPagesResponse(n_pages=total_pages)


@app.get("/quotes/me", response_model=model.QuoteCollection)
async def current_quotes(conn: ConnectionDep, current_user: CurrentUserDep):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=403, detail="User not associated with an author."
        )
    quotes = crud.get_quotes_by_author(conn, current_user.author_id)
    return model.QuoteCollection(quotes=quotes)


@app.get(
    "/quotes/search/tag/{tag_name_str}", response_model=model.QuotePageResponse
)
async def get_quotes_by_tag_name_endpoint(
    tag_name_str: str,
    conn: ConnectionDep,
    current_user: OptionalCurrentUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    Get quotes associated with a specific tag name, with pagination.
    """
    tag = crud.get_tag_by_name(conn, tag_name_str.lower())
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag '{tag_name_str}' not found.",
        )

    quotes_for_tag = crud.get_quotes_by_tag(conn, tag.id)
    if not quotes_for_tag:
        return model.QuotePageResponse(
            quotes=[], totalPages=0, currentPage=page, totalItems=0
        )

    user_id = current_user.id if current_user else None
    quote_page_entries = []

    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    paginated_db_quotes = quotes_for_tag[start_index:end_index]

    for quote_model in paginated_db_quotes:
        author = crud.get_author_by_id(conn, quote_model.author_id)
        author_name = author.name if author else "Unknown"
        author_id = author.id if author else None

        is_favorited = False
        favorite_count = 0
        if user_id:
            is_favorited = crud.is_quote_favorited_by_user(
                conn, user_id, quote_model.id
            )
        favorite_count = crud.get_quote_favorite_count(conn, quote_model.id)

        quote_page_entries.append(
            model.QuotePageEntry(
                id=quote_model.id,
                text=quote_model.text,
                author=author_name,
                authorName=author_name,
                authorId=author_id,
                tags=[t.name for t in quote_model.tags],
                isFavorited=is_favorited,
                favoriteCount=favorite_count,
            )
        )

    total_quotes_for_tag = len(quotes_for_tag)
    total_pages_for_tag = math.ceil(total_quotes_for_tag / page_size)

    return model.QuotePageResponse(
        quotes=quote_page_entries,
        totalPages=total_pages_for_tag,
        currentPage=page,
        totalItems=total_quotes_for_tag,
    )


@app.get("/quotes/{quote_id}", response_model=Optional[model.QuotePageEntry])
async def get_quote_by_id_endpoint(
    quote_id: int, conn: ConnectionDep, current_user: OptionalCurrentUserDep
):
    user_id = current_user.id if current_user else None
    quote = crud.get_quote_details_for_page_entry(
        conn, quote_id=quote_id, current_user_id=user_id
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@app.post(
    "/quotes/create",
    response_model=model.QuotePageEntry,
    status_code=status.HTTP_201_CREATED,
)
async def create_quote(
    payload: model.CreateQuoteClientPayload,
    conn: ConnectionDep,
    current_user: CurrentUserDep,
):
    if current_user.id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not authenticated.",
        )
    try:
        new_quote_page_entry = crud.create_quote_with_client_payload(
            conn, payload=payload, user_id=current_user.id
        )
        return new_quote_page_entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create quote.")


@app.put("/quotes/{quote_id}", response_model=model.QuotePageEntry)
async def update_quote_endpoint(
    quote_id: int,
    payload: model.UpdateQuoteClientPayload,
    conn: ConnectionDep,
    current_user: CurrentUserDep,
):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with an author, cannot update quotes.",
        )
    try:
        updated_quote = crud.update_quote_with_client_payload(
            conn,
            quote_id=quote_id,
            payload=payload,
            user_author_id=current_user.author_id,
        )
        if updated_quote is None:
            raise HTTPException(
                status_code=404, detail="Quote not found or not updated."
            )
        return updated_quote
    except ValueError as e:
        if "not authorized" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update quote.")


@app.delete("/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote_endpoint(
    quote_id: int, conn: ConnectionDep, current_user: CurrentUserDep
):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with an author, cannot delete quotes.",
        )
    try:
        success = crud.delete_quote_for_user(
            conn, quote_id=quote_id, user_author_id=current_user.author_id
        )
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Quote not found or could not be deleted.",
            )
    except ValueError as e:
        if "not authorized" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete quote.")
    return


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


@app.get("/tags/all", response_model=List[model.TagEntry], tags=["Tags"])
async def get_all_tags_with_counts_endpoint(conn: ConnectionDep):
    try:
        tags_with_counts = crud.get_all_unique_tags_with_counts(conn)
        return tags_with_counts
    except Exception as e:
        print(f"Error fetching all tags with counts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tags.",
        )


@app.get("/quotes/search/", response_model=List[model.QuotePageEntry])
async def search_quotes_endpoint(
    conn: ConnectionDep,
    current_user: OptionalCurrentUserDep,
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
        user_id = current_user.id if current_user else None
        quotes = crud.search_quotes_semantic(
            conn,
            query_embedding,
            limit=limit,
            skip=skip,
            current_user_id=user_id,
        )
        return quotes
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during semantic search: {str(e)}"
        )


# New endpoint to get all mock quotes
@app.get(
    "/api/v1/mock/quotes/all",
    response_model=List[model.CSVMockQuote],
    tags=["Mock Data"],
)
async def get_all_mock_quotes():
    return embedding.CSV_QUOTES_DATA


# New endpoint for semantic search on mock quotes
@app.get(
    "/api/v1/mock/quotes/search",
    response_model=List[model.CSVMockQuote],
    tags=["Mock Data"],
)
async def search_mock_quotes_semantic(
    query: str = Query(
        ..., min_length=1, description="Search query for quotes"
    ),
    top_n: int = Query(
        10, gt=0, le=50, description="Number of similar quotes to return"
    ),
):
    if not embedding.CSV_QUOTES_DATA or embedding.CSV_QUOTE_EMBEDDINGS is None:
        return []

    results = embedding.search_similar_quotes(query_text=query, top_n=top_n)
    return results


# --- Favorite Endpoints --- START ---
@app.post(
    "/quotes/{quote_id}/favorite", status_code=status.HTTP_204_NO_CONTENT
)
async def favorite_a_quote(
    quote_id: int, conn: ConnectionDep, current_user: CurrentUserDep
):
    quote = crud.get_quote_by_id(conn, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found"
        )

    try:
        crud.add_favorite(conn, current_user.id, quote_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
    return


@app.delete(
    "/quotes/{quote_id}/favorite", status_code=status.HTTP_204_NO_CONTENT
)
async def unfavorite_a_quote(
    quote_id: int, conn: ConnectionDep, current_user: CurrentUserDep
):
    quote = crud.get_quote_by_id(conn, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found"
        )

    try:
        crud.remove_favorite(conn, current_user.id, quote_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
    return


# --- Favorite Endpoints --- END ---


# --- Collection Endpoints --- START ---
@app.post(
    "/collections/create",
    response_model=model.Collection,
    status_code=status.HTTP_201_CREATED,
)
async def create_new_collection(
    collection_data: model.CreateCollectionClientPayload,
    conn: ConnectionDep,
    current_user: CurrentUserDep,
):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an author and cannot create collections.",
        )

    full_collection_data = model.CreateCollectionQuery(
        name=collection_data.name,
        description=collection_data.description,
        is_public=collection_data.is_public,
        author_id=current_user.author_id,
    )

    try:
        new_collection = crud.create_collection(conn, full_collection_data)
        return new_collection
    except ValueError as e:
        if (
            "unique constraint" in str(e).lower()
            or "already exists" in str(e).lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A collection with the name '{full_collection_data.name}' already exists for this author.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the collection.",
        )


@app.get("/collections/my", response_model=List[model.Collection])
async def get_my_collections(
    conn: ConnectionDep, current_user: CurrentUserDep
):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an author.",
        )
    collections = crud.get_collections_from_author(
        conn, current_user.author_id
    )
    return collections


@app.get("/collections/{collection_id}", response_model=model.Collection)
async def get_single_collection(
    collection_id: int,
    conn: ConnectionDep,
    current_user: OptionalCurrentUserDep,
    request: Request,
):
    print(f"[get_single_collection] Request headers: {request.headers}")
    user_id = current_user.id if current_user else None
    print(
        f"Attempting to fetch collection {collection_id} for user_id: {user_id}"
    )
    collection = crud.get_collection_by_id(
        conn, collection_id, current_user_id=user_id
    )
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if not collection.is_public:
        print(f"Collection {collection_id} is private.")
        if current_user:
            print(
                f"Current user ID: {current_user.id}, Current user author_id: {current_user.author_id}"
            )
        else:
            print("Current user is None.")
        print(f"Collection author_id: {collection.author_id}")
        if (
            current_user is None
            or current_user.author_id != collection.author_id
        ):
            print(
                f"Authorization failed for user {current_user.id if current_user else 'None'} and collection {collection_id}."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this collection",
            )
    return collection


@app.put("/collections/{collection_id}", response_model=model.Collection)
async def update_existing_collection(
    collection_id: int,
    collection_data: model.UpdateCollectionQuery,
    conn: ConnectionDep,
    current_user: CurrentUserDep,
):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an author and cannot update collections.",
        )
    try:
        updated_collection = crud.update_collection(
            conn, collection_id, collection_data, current_user.author_id
        )
        if updated_collection is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found or user not authorized to update.",
            )
        return updated_collection
    except ValueError as e:
        if "not authorized" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        if "already exists" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating the collection.",
        )


@app.delete(
    "/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_existing_collection(
    collection_id: int, conn: ConnectionDep, current_user: CurrentUserDep
):
    if current_user.author_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an author and cannot delete collections.",
        )
    try:
        success = crud.delete_collection_by_id(
            conn, collection_id, current_user.author_id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found.",
            )
    except ValueError as e:
        if "not authorized" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting the collection.",
        )


@app.post(
    "/collections/{collection_id}/quotes/{quote_id}",
    response_model=model.CollectionQuoteLink,
    status_code=status.HTTP_201_CREATED,
    tags=["Collections"],
)
async def add_quote_to_collection_api(
    collection_id: int,
    quote_id: int,
    conn: ConnectionDep,
    current_user: CurrentUserDep,
):
    """Adds a quote to a specific collection owned by the current user."""
    try:
        link = crud.user_add_quote_to_collection(
            conn, current_user.id, quote_id, collection_id
        )
        return link
    except ValueError as e:
        if "not authorized" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        elif "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )


@app.delete(
    "/collections/{collection_id}/quotes/{quote_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Collections"],
)
async def remove_quote_from_collection_api(
    collection_id: int,
    quote_id: int,
    conn: ConnectionDep,
    current_user: CurrentUserDep,
):
    """Removes a quote from a specific collection owned by the current user."""
    try:
        success = crud.user_remove_quote_from_collection(
            conn, current_user.id, quote_id, collection_id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found in collection or collection not found.",
            )
        return
    except ValueError as e:
        if "not authorized" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        elif "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )


# --- Collection Endpoints --- END ---


# --- Collection Search Endpoint --- START ---
@app.get(
    "/api/v1/collections/search/",
    response_model=List[model.CollectionEntry],
    tags=["Collections Search"],
)
async def search_collections_endpoint(
    conn: ConnectionDep,
    current_user: OptionalCurrentUserDep,
    query: str = Query(
        "",
        description="Text to search for in collection names and descriptions. Empty string for all public.",
    ),
    limit: int = Query(
        10, gt=0, le=100, description="Number of results to return"
    ),
    skip: int = Query(
        0, ge=0, description="Number of results to skip for pagination"
    ),
):
    try:
        user_id_param = current_user.id if current_user else None
        collections = crud.search_collections(
            conn,
            search_term=query,
            limit=limit,
            skip=skip,
            current_user_id=user_id_param,
        )
        return collections
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during collection search: {str(e)}",
        )


# --- Collection Search Endpoint --- END ---


# --- Tag Search Endpoint --- START ---
@app.get("/tags/search/", response_model=List[model.TagEntry], tags=["Tags"])
async def search_tags_endpoint(
    conn: ConnectionDep,
    query: str = Query(
        ...,
        min_length=1,
        description="Text to search for in tag names.",
    ),
    limit: int = Query(
        20, gt=0, le=100, description="Number of results to return"
    ),
    skip: int = Query(
        0, ge=0, description="Number of results to skip for pagination"
    ),
):
    if not query.strip():
        return []
    try:
        tags_with_counts = crud.search_tags_by_name(
            conn, search_term=query, limit=limit, skip=skip
        )
        return tags_with_counts
    except Exception as e:
        print(f"Error searching tags: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search tags.",
        )


# --- Tag Search Endpoint --- END ---
