// frontend-next/lib/api.ts
import { toast } from "sonner"; // Import toast

// Define interfaces for expected API responses based on your backend models
// These should ideally match or be derived from your backend's Pydantic models

export interface ApiErrorData {
  detail?: string | { msg: string; type: string }[]; // FastAPI error structure
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Updated QuotePageEntry to include fields used by the component
export interface QuotePageEntry {
  id: number;
  text: string;
  // author: string; // This was 'author: string', if it's an object, it needs to be defined e.g. { id: number, name: string }
  // For now, let's assume the component was adapting from a flat structure.
  // The component uses quote.author.id and quote.author.name, AND quote.authorId, quote.authorName.
  // Let's define it based on the most detailed usage and assume backend can provide it:
  authorId?: number; // Made optional if `author` object is primary
  authorName?: string; // Made optional if `author` object is primary. This will be the source of truth for author's name.
  tags: string[];
  isFavorited?: boolean; // Added
  favoriteCount?: number;  // Added
  // Add any other fields your QuotePageEntry might have from the backend
}

// Interface for TagEntry (used for /tags/all endpoint)
export interface TagEntry {
  name: string;
  quoteCount: number;
}

// Interface for backend model.Tag
export interface BackendTag {
  id: number;
  name: string;
}

// Interface for backend model.Quote (simplified for what /quotes/me might return inside QuoteCollection)
export interface BackendQuote {
  id: number;
  author_id: number;
  text: string;
  is_public: boolean;
  embedding?: number[]; // Or List[float] if that translates from Python
  tags: BackendTag[];
  created_at: string; // Assuming datetime is serialized as string
  updated_at: string;
  isFavorited?: boolean; // This comes from enrichment, backend model.Quote doesn't have it directly
  favoriteCount?: number; // This also comes from enrichment
}

export interface QuoteCollectionResponse {
  quotes: BackendQuote[];
}

// Updated QuotePageResponse to include totalPages
export interface QuotePageResponse {
  quotes: QuotePageEntry[];
  totalPages?: number; // Added for pagination
  totalItems?: number; // Optional: if backend provides total items for client-side page count
  currentPage?: number; // Optional: if backend provides current page
}


const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FetchApiOptions extends RequestInit {
  token?: string | null;
  isFormData?: boolean;
}

async function fetchApi<T>(endpoint: string, options: FetchApiOptions = {}): Promise<T> {
  const { token, isFormData, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  if (!isFormData && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${BASE_API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiErrorData = {};
      try {
        errorData = await response.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Ignore if response is not JSON or empty
      }
      const errorMessage =
        typeof errorData.detail === 'string' ? errorData.detail :
          Array.isArray(errorData.detail) ? errorData.detail.map(d => d.msg || 'Unknown error detail').join(', ') :
            `API request failed with status ${response.status}`;

      // Show generic error toast
      toast.error("An API error occurred", { description: errorMessage });
      throw new Error(errorMessage);
    }

    // Handle cases where response might be empty (e.g., 204 No Content)
    if (response.status === 204) {
      return null as T; // Or handle as appropriate for your app
    }

    return response.json() as Promise<T>;
  } catch (error) {
    // Catch network errors or other issues not caught by !response.ok
    if (!(error instanceof Error && error.message.startsWith("API request failed"))) {
      // Avoid double-toasting if already handled by response.ok check
      toast.error("Network or system error", { description: error instanceof Error ? error.message : String(error) });
    }
    throw error; // Re-throw the error to be caught by the calling function if needed
  }
}

// --- Authentication --- //
export const loginUser = async (username: string, password: string): Promise<TokenResponse> => {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  return fetchApi<TokenResponse>('/token', {
    method: 'POST',
    body: body,
    isFormData: true, // To ensure Content-Type: application/x-www-form-urlencoded is handled
  });
};

// --- Quotes --- //

/**
 * Fetches a specific page of quotes.
 * Uses the /quotes/page/{page_number} endpoint from the backend.
 */
export const getQuotesPage = async (pageNumber: number, token?: string | null): Promise<QuotePageResponse> => {
  return fetchApi<QuotePageResponse>(`/quotes/page/${pageNumber}`, {
    method: 'GET',
    token,
  });
};

/**
 * Searches quotes semantically.
 * Uses the /quotes/search/ endpoint from the backend.
 * Note: The backend /quotes/search/ endpoint expects query, limit, skip as query parameters.
 */
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
  // Assuming search returns a list of quotes, not a paginated response object
  // If it returns a paginated response, this should be Promise<QuotePageResponse>
  return fetchApi<QuotePageEntry[]>(`/quotes/search/?${params.toString()}`, {
    method: 'GET',
    token,
  });
};

/**
 * Fetches a single quote by its ID.
 */
export const getQuoteById = async (quoteId: number, token?: string | null): Promise<QuotePageEntry | null> => {
  // The backend returns model.QuotePageEntry or null if not found (404)
  // The fetchApi function will throw an error for 404 if not handled specifically.
  // We need to catch 404 and return null, otherwise rethrow.
  try {
    return await fetchApi<QuotePageEntry>(`/quotes/${quoteId}`, {
      method: 'GET',
      token,
    });
  } catch (error) {
    // A bit simplistic, ideally check error.status or similar if fetchApi exposed it
    if (error instanceof Error && error.message.includes("404")) { // Check if message contains 404
      return null; // Quote not found
    }
    throw error; // Re-throw other errors
  }
};

/**
 * Fetches quotes for the currently authenticated user.
 * Returns a structure containing a list of BackendQuote objects.
 */
export const getMyQuotes = async (token: string | null): Promise<QuoteCollectionResponse> => {
  if (!token) throw new Error('Authentication token is required to fetch user quotes.');
  // Backend /quotes/me returns model.QuoteCollection which is { quotes: List[model.Quote] }
  // So, T in fetchApi will be QuoteCollectionResponse
  return fetchApi<QuoteCollectionResponse>('/quotes/me', {
    method: 'GET',
    token,
  });
};

// --- Favorite/Unfavorite --- //

/**
 * Fetches all unique tags with their quote counts.
 */
export const getAllTagsWithCounts = async (token?: string | null): Promise<TagEntry[]> => {
  return fetchApi<TagEntry[]>('/tags/all', {
    method: 'GET',
    token, // Include token if endpoint requires auth, remove if public
  });
};

/**
 * Favorites a quote.
 */
export const favoriteQuote = async (quoteId: number, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to favorite a quote.');
  return fetchApi<void>(`/quotes/${quoteId}/favorite`, {
    method: 'POST',
    token,
  });
};

/**
 * Unfavorites a quote.
 */
export const unfavoriteQuote = async (quoteId: number, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to unfavorite a quote.');
  return fetchApi<void>(`/quotes/${quoteId}/favorite`, { // Note: Endpoint is DELETE
    method: 'DELETE',
    token,
  });
};

// --- Collection Search --- //

/**
 * Searches collections.
 * Uses the /api/v1/collections/search/ endpoint from the backend.
 */
export const searchCollections = async (
  query: string,
  limit: number = 10,
  skip: number = 0,
  token?: string | null // Token might be used in future for personalized collection results
): Promise<CollectionEntry[]> => {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
  });
  params.append('query', query); // Always append query, even if empty string

  const endpoint = `/api/v1/collections/search/?${params.toString()}`;
  return fetchApi<CollectionEntry[]>(endpoint, {
    method: 'GET',
    token,
  });
};

// --- Collections --- //

// This was previously defined in collection-utils.ts, ensuring it's available and exported here.
// It should match the structure returned by the backend for individual collections and lists.
export interface CollectionEntry {
  id: number;
  name: string;
  description?: string; // Made optional to align with backend Optional[str]
  isPublic: boolean;
  authorId: number;
  // authorName might be included if backend provides it, especially for public listings
  authorName?: string;
  quoteCount?: number; // Often included in listings
  // quotes?: QuotePageEntry[]; // Full quotes usually in getCollectionById, not simple listings
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// New interface for detailed collection view, including quotes
export interface CollectionDetails extends CollectionEntry {
  quotes: QuotePageEntry[]; // Assuming QuotePageEntry is already defined
}

// Payload for creating a new collection (frontend version)
// author_id will be set by the backend based on the authenticated user
export interface CreateCollectionPayload {
  name: string;
  description: string;
  isPublic: boolean;
}

/**
 * Creates a new collection.
 */
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

/**
 * Updates an existing collection.
 */
export const updateCollection = async (
  collectionId: number,
  payload: UpdateCollectionPayload,
  token: string | null
): Promise<CollectionEntry> => { // Assuming backend returns the full CollectionEntry on update
  if (!token) throw new Error('Authentication token is required to update a collection.');

  return fetchApi<CollectionEntry>(`/collections/${collectionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

/**
 * Deletes a collection.
 */
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

/**
 * Fetches collections for the authenticated user.
 */
export const getMyCollections = async (token: string | null): Promise<CollectionEntry[]> => {
  if (!token) throw new Error('Authentication token is required to fetch user collections.');
  return fetchApi<CollectionEntry[]>('/collections/my', {
    method: 'GET',
    token,
  });
};

/**
 * Fetches a single collection by its ID.
 * Token is optional for public collections, required for private ones (backend handles auth).
 */
export const getCollectionById = async (collectionId: number, token: string | null): Promise<CollectionDetails> => {
  return fetchApi<CollectionDetails>(`/collections/${collectionId}`, {
    method: 'GET',
    token, // Send token if available, backend will decide if it's needed
  });
};

// Add other API functions here as needed, e.g., for creating quotes, collections, user profile, etc.

// --- User Profile & Auth --- //
export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  // author_id is also in backend model.User but not in UserResponse model
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
}

/**
 * Fetches the profile of the currently authenticated user.
 */
export const getCurrentUserProfile = async (token: string | null): Promise<UserProfileResponse> => {
  if (!token) throw new Error('Authentication token is required to fetch user profile.');
  return fetchApi<UserProfileResponse>('/users/me', {
    method: 'GET',
    token,
  });
};

/**
 * Registers a new user.
 */
export const registerUser = async (payload: CreateUserPayload): Promise<UserProfileResponse> => {
  return fetchApi<UserProfileResponse>('/users/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// --- Author Details --- //
export interface AuthorQuoteSimple {
  id: number;
  text: string;
  tags: BackendTag[]; // Reusing BackendTag from above for consistency
}

export interface AuthorCollectionSimple {
  id: number;
  name: string;
}

export interface AuthorDetailsResponse {
  id: number;
  name: string;
  quotes: AuthorQuoteSimple[];
  collections: AuthorCollectionSimple[];
  // bio is not part of backend model.AuthorResponse
}

// --- New Author List Types ---
export interface AuthorEntry {
  id: number;
  name: string;
  // bio?: string; // Add if you include it in backend AuthorEntry
  // avatarUrl?: string; // Add if you include it in backend AuthorEntry
}

export interface PaginatedAuthorsResponse {
  authors: AuthorEntry[];
  total_pages: number;
  current_page?: number;
  total_items?: number;
}
// --- End New Author List Types ---

/**
 * Fetches details for a specific author.
 */
export const getAuthorDetails = async (authorId: number): Promise<AuthorDetailsResponse> => {
  return fetchApi<AuthorDetailsResponse>(`/authors/${authorId}`, {
    method: 'GET',
    // No token usually needed for public author profiles
  });
};

// --- New Function to Get Authors ---
export const getAuthors = async (
  searchTerm?: string,
  limit: number = 20,
  skip: number = 0,
  // token?: string | null // Authors list is public, token not needed for now
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
// --- End New Function to Get Authors ---

// --- Tag Generation --- //
export interface GenerateTagsPayload {
  quote: string;
  author: string;
}

/**
 * Generates tags for a given quote and author.
 */
export const generateTagsForQuote = async (payload: GenerateTagsPayload): Promise<string[]> => {
  return fetchApi<string[]>('/tags/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// --- Quote Create, Update, Delete ---

// Payload for creating a quote from client (matches CreateQuoteClientPayload on backend)
export interface CreateQuoteClientPayload {
  text: string;
  authorName: string;
  tags: string[];
}

/**
 * Creates a new quote.
 */
export const createQuote = async (payload: CreateQuoteClientPayload, token: string | null): Promise<QuotePageEntry> => {
  if (!token) throw new Error('Authentication token is required to create a quote.');
  return fetchApi<QuotePageEntry>('/quotes/create', { // Endpoint from backend main.py
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
};

// Payload for updating a quote (matches UpdateQuoteClientPayload on backend)
export interface UpdateQuotePayload {
  text?: string;
  authorName?: string;
  tags?: string[];
}

/**
 * Updates an existing quote.
 */
export const updateQuote = async (
  quoteId: number,
  payload: UpdateQuotePayload,
  token: string | null
): Promise<QuotePageEntry> => {
  if (!token) throw new Error('Authentication token is required to update a quote.');
  return fetchApi<QuotePageEntry>(`/quotes/${quoteId}`, { // Endpoint from backend main.py for PUT
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

/**
 * Deletes a quote.
 */
export const deleteQuote = async (quoteId: number, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to delete a quote.');
  return fetchApi<void>(`/quotes/${quoteId}`, { // Endpoint from backend main.py for DELETE
    method: 'DELETE',
    token,
  });
};

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

/**
 * Changes the password for the currently authenticated user.
 */
export const changePassword = async (payload: ChangePasswordPayload, token: string | null): Promise<void> => {
  if (!token) throw new Error('Authentication token is required to change password.');
  return fetchApi<void>('/users/me/password', { // Assuming this endpoint
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

export interface UpdateUserPreferencesPayload {
  email_notifications?: boolean;
  push_notifications?: boolean;
  // Add other preference fields here if needed in the future
}

/**
 * Updates preferences for the currently authenticated user.
 */
export const updateUserPreferences = async (payload: UpdateUserPreferencesPayload, token: string | null): Promise<UserProfileResponse> => {
  if (!token) throw new Error('Authentication token is required to update preferences.');
  // Assuming the backend returns the updated user profile
  return fetchApi<UserProfileResponse>('/users/me/preferences', { // Assuming this endpoint
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

export interface UpdateUserProfilePayload {
  username?: string;
  email?: string;
  // bio?: string; // Add if backend supports bio updates on the User model
}

/**
 * Updates the profile for the currently authenticated user.
 */
export const updateUserProfile = async (payload: UpdateUserProfilePayload, token: string | null): Promise<UserProfileResponse> => {
  if (!token) throw new Error('Authentication token is required to update profile.');
  // Assuming a PUT request to /users/me endpoint for updates
  return fetchApi<UserProfileResponse>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
};

/**
 * Searches quotes by a specific tag.
 * Assumes a backend endpoint like /quotes/search/tag/{tagName}
 */
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

// --- Tag Search --- //

/**
 * Searches tags by name.
 * Uses the /tags/search/ endpoint from the backend.
 */
export const searchTags = async (
  query: string,
  limit: number = 20,
  skip: number = 0,
  token?: string | null // Token might be needed if search becomes personalized
): Promise<TagEntry[]> => {
  if (!query.trim()) {
    // Avoid API call if query is empty, backend would reject or return empty anyway
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
    token, // Pass token if available, though current backend endpoint doesn't use it
  });
};
