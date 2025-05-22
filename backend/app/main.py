from datetime import timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from jwt.exceptions import InvalidTokenError
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from psycopg import Connection

import app.security as security
import app.db as db
import app.crud as crud
import app.model as model


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]
ConnectionDep = Annotated[Connection, Depends(db.get_connection_gen)]
PasswordFormDep = Annotated[OAuth2PasswordRequestForm, Depends()]

async def get_current_user(conn: ConnectionDep, token: TokenDep):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt_decode(token)
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    user = crud.get_user_by_name(conn, username)
    return user

CurrentUserDep = Annotated[model.User, Depends(get_current_user)]

app = FastAPI()

@app.post("/token")
async def login_for_access_token(conn: ConnectionDep, form_data: PasswordFormDep):
    user = crud.get_user_by_name(conn, form_data.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not security.check_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    acces_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    acces_token = security.create_access_token(
        data={"sub": form_data.username}, expires_delta=acces_token_expires
    )
    return security.Token(access_token=acces_token, token_type="bearer")


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/users/create", response_model=model.UserIdResponse)
async def create_new_user(conn: ConnectionDep, query: model.CreateUserQuery):
    user = crud.create_user(conn, query)
    return model.UserIdResponse(id=user.id)

@app.get("/users/check-valid-username", response_model=model.ValidationResponse)
async def check_if_username_is_valid(conn: ConnectionDep, query: model.UserNameQuery):
    user = crud.get_author_by_name(conn, query.username)
    return model.ValidationResponse(valid=user is None)


@app.get("/users/me", response_model=model.User)
async def current_user(current_user: CurrentUserDep):
    return current_user

@app.get("/quotes/me", response_model=model.QuoteCollection)
async def current_quotes(conn: ConnectionDep, current_user: CurrentUserDep):
    author = model.Author(id=current_user.id, name=current_user.username)
    quotes = crud.get_quotes_by_author(conn, author)
    return model.QuoteCollection(quotes=quotes)

@app.post("/quotes/create", response_model=model.Quote)
async def create_quote(conn: ConnectionDep, current_user: CurrentUserDep, quote_content: str):
    query = model.CreateQuoteQuery(author_id=current_user.id, text=quote_content, is_public=True)
    quote = crud.create_quote(conn, query)
    return quote
