const API_URL = "http://localhost:8000"

type CreateUserRequest = {
  username: string,
  email: string,
  password: string,
}

type QuotePageRequest = {
  page_number: number,
}

type QuotePageEntry = {
  quote_id: number,
  quote_text: string,
  quote_is_public: boolean,
  author_id: number,
  author_name: string,
}

type QuotesTotalPagesResponse = {
  n_pages: number,
}

type QuotePageResponse = {
  quotes: Array<QuotePageEntry>
}

type UserIdResponse = {
  id: string,    
}

type QuoteSimple = {
  id: number,
  text: string,
}

type CollectionSimple = {
  id: string,
  name: string,
  description: string,
}

type AuthorResponse = {
  id: string,
  name: string,
  quotes: Array<QuoteSimple>,
  collections: Array<CollectionSimple>,
}

async function createUser(request: CreateUserRequest): Promise<UserIdResponse> {
  const response = await fetch(`${API_URL}/users/create`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

async function getQuotePage(request: QuotePageRequest): Promise<QuotePageResponse> {
  const response = await fetch(`${API_URL}/quotes/page/${request.page_number}`, {
    method: "GET",
  });
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

async function getQuoteTotalPages(): Promise<QuotesTotalPagesResponse> {
  const response = await fetch(`${API_URL}/quotes/get-n-pages`, {
    method: "GET",
  });
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

async function getAuthorInfo(authorId: number): Promise<AuthorResponse> {
  const response = await fetch(`${API_URL}/authors/${authorId}`, {
    method: "GET",
  });
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

export type { QuotePageEntry, AuthorResponse}

export { createUser, getQuotePage, getQuoteTotalPages, getAuthorInfo};