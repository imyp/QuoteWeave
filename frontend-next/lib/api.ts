import { toast } from "sonner";

// Define types for JSON-like structures
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Helper functions for case conversion
const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const toSnake = (s: string): string => {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const convertKeys = (obj: JsonValue, converter: (s: string) => string): JsonValue => {
  if (Array.isArray(obj)) {
    return obj.map((i: JsonValue) => convertKeys(i, converter));
  } else if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    const newObj: JsonObject = {};
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        newObj[converter(k)] = convertKeys(obj[k], converter);
      }
    }
    return newObj;
  }
  return obj;
};

export interface ApiErrorData {
  detail?: string | { msg: string; type: string }[];
  isFormData?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
}

export interface QuotePageEntry {
  id: number;
  text: string;
  authorId?: number;
  authorName?: string;
  tags: string[];
  isFavorited?: boolean;
  favoriteCount?: number;
  userCollections?: { id: number; name: string }[];
}

export interface TagEntry {
  name: string;
  quoteCount: number;
}

export interface BackendTag {
  id: number;
  name: string;
}

export interface BackendQuote {
  id: number;
  authorId: number;
  text: string;
  isPublic: boolean;
  embedding?: number[];
  tags: BackendTag[];
  createdAt: string;
  updatedAt: string;
  isFavorited?: boolean;
  favoriteCount?: number;
}

export interface QuoteCollectionResponse {
  quotes: BackendQuote[];
}

export interface QuotePageResponse {
  quotes: QuotePageEntry[];
  totalPages?: number;
  totalItems?: number;
  currentPage?: number;
}


const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FetchApiOptions extends RequestInit {
  token?: string | null;
  isFormData?: boolean;
}

async function fetchApi<T>(endpoint: string, options: FetchApiOptions = {}): Promise<T> {
  const { token, isFormData, body, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  if (!isFormData && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }

  let processedBody = body;
  if (body && typeof body === 'string' && headers.get('Content-Type') === 'application/json' && !isFormData) {
    try {
      const parsedBody = JSON.parse(body);
      processedBody = JSON.stringify(convertKeys(parsedBody, toSnake));
    } catch (e) {
      // If parsing fails, assume it's not a JSON string that needs conversion
      // or it's already in the correct format.
      console.warn("Could not parse body for snake_case conversion:", e);
    }
  }


  try {
    const response = await fetch(`${BASE_API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      body: processedBody,
    });

    if (!response.ok) {
      let errorData: ApiErrorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        console.error("Error parsing JSON response:", e);
      }
      const errorMessage =
        typeof errorData.detail === 'string' ? errorData.detail :
          Array.isArray(errorData.detail) ? errorData.detail.map(d => d.msg || 'Unknown error detail').join(', ') :
            `API request failed with status ${response.status}`;

      toast.error("An API error occurred", { description: errorMessage });
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as T;
    }

    const jsonData: unknown = await response.json();
    return convertKeys(jsonData as JsonValue, toCamel) as T;
  } catch (error) {
    if (!(error instanceof Error && error.message.startsWith("API request failed"))) {
      toast.error("Network or system error", { description: error instanceof Error ? error.message : String(error) });
    }
    throw error;
  }
}

export const loginUser = async (username: string, password: string): Promise<TokenResponse> => {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  return fetchApi<TokenResponse>('/token', {
    method: 'POST',
    body: body,
    isFormData: true,
  });
};

export const getQuotesPage = async (pageNumber: number, token?: string | null): Promise<QuotePageResponse> => {
  return fetchApi<QuotePageResponse>(`/quotes/page/${pageNumber}`, {
    method: 'GET',
    token,
  });
};

export const searchQuotesSemantic = async (
  query: string,
  limit: number = 10,
  skip: number = 0,
  token?: string | null
): Promise<QuotePageEntry[]> => {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    skip: String(skip),
  });
  return fetchApi<QuotePageEntry[]>(`/quotes/search/?${params.toString()}`, {
    method: 'GET',
    token,
  });
};

export const getQuoteById = async (quoteId: number, token?: string | null): Promise<QuotePageEntry | null> => {
  try {
    return await fetchApi<QuotePageEntry>(`/quotes/${quoteId}`, {
      method: 'GET',
      token,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
};

export const getMyQuotes = async (token: string | null): Promise<QuoteCollectionResponse> => {
  if (!token) throw new Error('Authentication token is required to fetch user quotes.');
  return fetchApi<QuoteCollectionResponse>('/quotes/me', {
    method: 'GET',
    token,
  });
};

export const getAllTagsWithCounts = async (token?: string | null): Promise<TagEntry[]> => {
  return fetchApi<TagEntry[]>('/tags/all', {
    method: 'GET',
    token,
  });
};

export const favoriteQuote = async (quoteId: number, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to favorite a quote.');
  return fetchApi<void>(`/quotes/${quoteId}/favorite`, {
    method: 'POST',
    token,
  });
};

export const unfavoriteQuote = async (quoteId: number, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to unfavorite a quote.');
  return fetchApi<void>(`/quotes/${quoteId}/favorite`, {
    method: 'DELETE',
    token,
  });
};

export const searchCollections = async (
  query: string,
  limit: number = 10,
  skip: number = 0,
  token?: string | null
): Promise<CollectionEntry[]> => {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
  });
  params.append('query', query);

  const endpoint = `/api/v1/collections/search/?${params.toString()}`;
  return fetchApi<CollectionEntry[]>(endpoint, {
    method: 'GET',
    token,
  });
};

export interface CollectionEntry {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  authorId: number;
  authorName?: string;
  quoteCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionDetails extends CollectionEntry {
  quotes: QuotePageEntry[];
}

export interface CreateCollectionPayload {
  name: string;
  description: string;
  isPublic: boolean;
}

export async function createCollection(
  payload: CreateCollectionPayload,
  token: string
): Promise<CollectionEntry> {
  console.log("API CALL: Creating new collection with payload:", payload);
  const response = await fetchApi<CollectionEntry>('/collections/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return response;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

interface BackendUpdateCollectionPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export const updateCollection = async (
  collectionId: number,
  payload: UpdateCollectionPayload,
  token: string | null
): Promise<CollectionEntry> => {
  if (!token) throw new Error('Authentication token is required to update a collection.');

  const backendApiPayload: BackendUpdateCollectionPayload = {};
  if (payload.name !== undefined) backendApiPayload.name = payload.name;
  if (payload.description !== undefined) backendApiPayload.description = payload.description;
  if (payload.isPublic !== undefined) backendApiPayload.isPublic = payload.isPublic;

  return fetchApi<CollectionEntry>(`/collections/${collectionId}`, {
    method: 'PUT',
    body: JSON.stringify(backendApiPayload),
    token,
  });
};

export const deleteCollection = async (
  collectionId: number,
  token: string | null
): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to delete a collection.');

  return fetchApi<void>(`/collections/${collectionId}`, {
    method: 'DELETE',
    token,
  });
};

export const getMyCollections = async (token: string | null): Promise<CollectionEntry[]> => {
  if (!token) throw new Error('Authentication token is required to fetch user collections.');
  return fetchApi<CollectionEntry[]>('/collections/my', {
    method: 'GET',
    token,
  });
};

export const getCollectionById = async (collectionId: number, token: string | null): Promise<CollectionDetails> => {
  return fetchApi<CollectionDetails>(`/collections/${collectionId}`, {
    method: 'GET',
    token,
  });
};

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
}

export const getCurrentUserProfile = async (token: string | null): Promise<UserProfileResponse> => {
  if (!token) throw new Error('Authentication token is required to fetch user profile.');
  return fetchApi<UserProfileResponse>('/users/me', {
    method: 'GET',
    token,
  });
};

export const registerUser = async (payload: CreateUserPayload): Promise<UserProfileResponse> => {
  return fetchApi<UserProfileResponse>('/users/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export interface AuthorQuoteSimple {
  id: number;
  text: string;
  tags: BackendTag[];
}

export interface AuthorCollectionSimple {
  id: number;
  name: string;
  isPublic: boolean;
  quoteCount: number;
}

export interface AuthorDetailsResponse {
  id: number;
  name: string;
  quotes: AuthorQuoteSimple[];
  collections: AuthorCollectionSimple[];
}

export interface AuthorEntry {
  id: number;
  name: string;
}

export interface PaginatedAuthorsResponse {
  authors: AuthorEntry[];
  totalPages: number;
  currentPage?: number;
  totalItems?: number;
}

export const getAuthorDetails = async (authorId: number): Promise<AuthorDetailsResponse> => {
  return fetchApi<AuthorDetailsResponse>(`/authors/${authorId}`, {
    method: 'GET',
  });
};

export const getAuthors = async (
  searchTerm?: string,
  limit: number = 20,
  skip: number = 0,
): Promise<PaginatedAuthorsResponse> => {
  const params = new URLSearchParams();
  if (searchTerm) {
    params.append('search', searchTerm);
  }
  params.append('limit', String(limit));
  params.append('skip', String(skip));

  return fetchApi<PaginatedAuthorsResponse>(`/authors?${params.toString()}`, {
    method: 'GET',
  });
};

export interface GenerateTagsPayload {
  quote: string;
  author: string;
}

export const generateTagsForQuote = async (payload: GenerateTagsPayload): Promise<string[]> => {
  return fetchApi<string[]>('/tags/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export interface CreateQuoteClientPayload {
  text: string;
  authorName: string;
  tags: string[];
}

export const createQuote = async (payload: CreateQuoteClientPayload, token: string | null): Promise<QuotePageEntry> => {
  if (!token) throw new Error('Authentication token is required to create a quote.');
  return fetchApi<QuotePageEntry>('/quotes/create', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
};

export interface UpdateQuotePayload {
  text?: string;
  authorName?: string;
  tags?: string[];
}

export const updateQuote = async (
  quoteId: number,
  payload: UpdateQuotePayload,
  token: string | null
): Promise<QuotePageEntry> => {
  if (!token) throw new Error('Authentication token is required to update a quote.');
  return fetchApi<QuotePageEntry>(`/quotes/${quoteId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

export const deleteQuote = async (quoteId: number, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to delete a quote.');
  return fetchApi<void>(`/quotes/${quoteId}`, {
    method: 'DELETE',
    token,
  });
};

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const changePassword = async (payload: ChangePasswordPayload, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to change password.');
  return fetchApi<void>('/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

export interface UpdateUserPreferencesPayload {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export const updateUserPreferences = async (payload: UpdateUserPreferencesPayload, token: string | null): Promise<UserProfileResponse> => {
  if (!token) throw new Error('Authentication token is required to update preferences.');
  return fetchApi<UserProfileResponse>('/users/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

export interface UpdateUserProfilePayload {
  username?: string;
  email?: string;
}

export const updateUserProfile = async (payload: UpdateUserProfilePayload, token: string | null): Promise<UserProfileResponse> => {
  if (!token) throw new Error('Authentication token is required to update profile.');
  return fetchApi<UserProfileResponse>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

export const searchQuotesByTag = async (
  tagName: string,
  page: number = 1,
  limit: number = 10,
  token?: string | null
): Promise<QuotePageResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return fetchApi<QuotePageResponse>(`/quotes/search/tag/${encodeURIComponent(tagName)}?${params.toString()}`, {
    method: 'GET',
    token,
  });
};

export const searchTags = async (
  query: string,
  limit: number = 20,
  skip: number = 0,
  token?: string | null
): Promise<TagEntry[]> => {
  if (!query.trim()) {
    return [];
  }
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    skip: String(skip),
  });
  const endpoint = `/tags/search/?${params.toString()}`;
  return fetchApi<TagEntry[]>(endpoint, {
    method: 'GET',
    token,
  });
};

export interface UserCollection {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  authorId: number;
  authorName: string;
  quoteCount?: number;
}

export async function getUserCollections(userId: number, token: string): Promise<UserCollection[]> {
  if (!token) throw new Error('Authentication token is required to fetch user collections.');
  return fetchApi<UserCollection[]>(`/users/${userId}/collections`, {
    method: 'GET',
    token,
  });
}

export async function addQuoteToCollection(
  collectionId: number,
  quoteId: number,
  token: string
): Promise<void> {
  const response = await fetch(`${BASE_API_URL}/collections/${collectionId}/quotes/${quoteId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to add quote to collection' }));
    throw new Error(errorData.detail || 'Failed to add quote to collection');
  }
}

export async function removeQuoteFromCollection(
  collectionId: number,
  quoteId: number,
  token: string
): Promise<void> {
  const response = await fetch(`${BASE_API_URL}/collections/${collectionId}/quotes/${quoteId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to remove quote from collection' }));
    throw new Error(errorData.detail || 'Failed to remove quote from collection');
  }
}
