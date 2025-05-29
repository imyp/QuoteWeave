"use client";

// Placeholder for API functions and types
export interface QuotePageEntry {
  id: number;
  authorId?: number;
  authorName: string;
  text: string;
  tags: string[];
  isFavorited?: boolean;
  favoriteCount?: number;
}

export interface PaginatedQuotesResponse {
  quotes: QuotePageEntry[];
  totalPages: number;
}

// Mock API Response type (consistent with collection-utils)
interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Define ApiResponse if it's not already globally available
// Ensure this is consistent with other util files if they also use it.
interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  error?: string; // For error messages from the server or client-side errors
}

interface ApiErrorResponse {
  detail?: string | { msg: string; type: string }[];
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response, operationName: string): Promise<ApiResponse<T>> {
  try {
    if (!response.ok) {
      let errorDetail = `Failed to ${operationName}.`;
      try {
        const errorData: ApiErrorResponse = await response.json();
        if (typeof errorData.detail === 'string') {
          errorDetail = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorDetail = errorData.detail.map(d => d.msg).join(", ");
        } else if (typeof (errorData as { message?: unknown }).message === 'string') {
          errorDetail = (errorData as { message: string }).message;
        }
      } catch {
        // Could not parse error JSON, use status text or generic message
        errorDetail = response.statusText || `HTTP error ${response.status} during ${operationName}.`;
      }
      console.error("API Error:", errorDetail, "Status:", response.status);
      return { success: false, message: errorDetail, error: errorDetail };
    }

    // If response is OK but no content (e.g., 204 for DELETE)
    if (response.status === 204) {
      return { success: true, message: `${operationName} successful.`, data: null as T };
    }

    const data = await response.json() as T;
    return { success: true, message: `${operationName} successful.`, data };

  } catch (error) {
    console.error(`Client-side error during ${operationName}:`, error);
    const errorMessage = error instanceof Error ? error.message : `An unknown client-side error occurred during ${operationName}.`;
    return { success: false, message: errorMessage, error: errorMessage };
  }
}

export async function getQuotePage(
  page: number,
  limit: number = 9,
  filters?: { tag?: string; authorId?: number }
): Promise<PaginatedQuotesResponse> { // This one might not need ApiResponse wrapper if direct data is preferred
  console.log(`API CALL: Fetching quotes page ${page}, limit ${limit}, filters:`, filters);
  const response = await fetch(`${API_BASE_URL}/quotes/page/${page}?page_size=${limit}`);
  // For GET operations that directly feed data displays, returning raw data or a simpler error throw might be fine.
  // The linter errors are for update/delete, so focusing on those for ApiResponse wrapper.
  if (!response.ok) { // Simplified error handling for this GET example
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Failed to fetch page ${page}`);
  }
  return response.json();
}

export async function getQuoteTotalPages(
  limit: number = 9,
  filters?: { tag?: string; authorId?: number }
): Promise<number> { // Similar to getQuotePage, direct data or simple error
  console.log(`API CALL: Fetching total quote pages, limit ${limit}, filters:`, filters);
  const response = await fetch(`${API_BASE_URL}/quotes/get-n-pages?page_size=${limit}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Failed to fetch total pages`);
  }
  const data = await response.json() as { n_pages: number };
  return data.n_pages;
}

export function getPageIndices(currentPage: number, totalPages: number, surrounding: number = 2) {
  const pages = new Set<number>();
  pages.add(1);
  if (totalPages > 0) pages.add(totalPages);

  for (let i = Math.max(2, currentPage - surrounding); i <= Math.min(totalPages - 1, currentPage + surrounding); i++) {
    pages.add(i);
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const result: (number | string)[] = [];

  if (totalPages === 0) return [];

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    if (i === 0) {
      result.push(page);
    } else {
      const prev = sortedPages[i - 1];
      if (page - prev === 1) {
        result.push(page);
      } else {
        result.push("...");
        result.push(page);
      }
    }
  }
  return result;
}

export async function getQuoteById(quoteId: number): Promise<QuotePageEntry | null> { // Direct data or simple error
  console.log(`API CALL: Fetching quote by ID: ${quoteId}`);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Failed to fetch quote ${quoteId}`);
  }
  return response.json();
}

export interface NewQuotePayload {
  text: string;
  authorName: string;
  tags: string[];
}

export async function submitNewQuote(payload: NewQuotePayload): Promise<ApiResponse<QuotePageEntry>> {
  console.log("API CALL: Submitting new quote:", payload);
  const response = await fetch(`${API_BASE_URL}/quotes/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add Authorization header if needed: 'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<QuotePageEntry>(response, "submit new quote");
}

export interface UpdateQuotePayload {
  text?: string;
  authorName?: string;
  tags?: string[];
}

export async function updateQuote(quoteId: number, payload: UpdateQuotePayload): Promise<ApiResponse<QuotePageEntry>> {
  console.log(`API CALL: Updating quote ${quoteId} with:`, payload);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add Authorization header
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<QuotePageEntry>(response, "update quote");
}

export async function deleteQuote(quoteId: number): Promise<ApiResponse<null>> {
  console.log(`API CALL: Deleting quote ${quoteId}`);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}`, {
    method: 'DELETE',
    headers: {
      // TODO: Add Authorization header
    },
  });
  return handleApiResponse<null>(response, "delete quote");
}

export async function favoriteQuote(quoteId: number): Promise<ApiResponse<null>> { // Favorite/unfavorite also benefit from ApiResponse
  console.log(`API CALL: Favoriting quote ${quoteId}`);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/favorite`, {
    method: 'POST',
    headers: {
      // TODO: Add Authorization header
    },
  });
  return handleApiResponse<null>(response, "favorite quote");
}

export async function unfavoriteQuote(quoteId: number): Promise<ApiResponse<null>> {
  console.log(`API CALL: Unfavoriting quote ${quoteId}`);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/favorite`, {
    method: 'DELETE',
    headers: {
      // TODO: Add Authorization header
    },
  });
  return handleApiResponse<null>(response, "unfavorite quote");
}

/**
 * Fetches quotes for the currently authenticated user.
 * Requires authentication token.
 */
export async function getMyQuotes(token: string): Promise<ApiResponse<QuotePageEntry[]>> {
  console.log("API CALL: Fetching my quotes");
  const response = await fetch(`${API_BASE_URL}/quotes/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  // The backend returns model.QuoteCollection ({ quotes: List[Quote] })
  // We need to ensure the transformation to QuotePageEntry[] happens if necessary,
  // or that QuotePageEntry is compatible with backend model.Quote.
  // For now, assuming direct compatibility or backend returns QuotePageEntry-like objects for this route.
  // If backend returns model.Quote[], the handleApiResponse will work, but the component
  // consuming it might need to adapt if it strictly expects QuotePageEntry fields like authorName.
  // The `model.Quote` has `author_id` but not `authorName` directly.
  // It also has `tags: List[Tag]` (object) vs `tags: string[]` in `QuotePageEntry`.
  // This will need careful handling in the component or a mapping layer.
  // For now, we will cast to QuotePageEntry[] and see.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiResponse = await handleApiResponse<any>(response, "fetch my quotes"); // Keep any for now due to complex backend/frontend type mismatch
  if (apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data.quotes)) {
    return {
      ...apiResponse,
      data: apiResponse.data.quotes as QuotePageEntry[], // Attempt to cast items
    };
  }
  // If the structure is not { quotes: [] }, return the original response or an error
  if (apiResponse.success && apiResponse.data && !Array.isArray(apiResponse.data.quotes)){
    // This case means the backend didn't return a QuoteCollection like {quotes: []}
    // but something else, or the structure is just List[Quote] directly.
    // If it's List[Quote] directly and Quote is compatible enough with QuotePageEntry:
    if(Array.isArray(apiResponse.data)){
        return {
            ...apiResponse,
            data: apiResponse.data as QuotePageEntry[]
        };
    }
    return {
        success: false,
        message: "Invalid data structure for my quotes.",
        error: "Invalid data structure",
        data: []
    };
  }
  return {
    ...apiResponse, // Return original error or success with unexpected data structure
    data: [], // Ensure data is an array even on error/unexpected structure
  };
}