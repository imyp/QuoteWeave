"use client";

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

interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface ApiErrorResponse {
  detail?: string | { msg: string; type: string }[];
}

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
        errorDetail = response.statusText || `HTTP error ${response.status} during ${operationName}.`;
      }
      console.error("API Error:", errorDetail, "Status:", response.status);
      return { success: false, message: errorDetail, error: errorDetail };
    }

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
): Promise<PaginatedQuotesResponse> {
  console.log(`API CALL: Fetching quotes page ${page}, limit ${limit}, filters:`, filters);
  let url = `${API_BASE_URL}/quotes/page/${page}?page_size=${limit}`;
  if (filters?.authorId) {
    url += `&author_id=${filters.authorId}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Failed to fetch page ${page}`);
  }
  return response.json();
}

export async function getQuoteTotalPages(
  limit: number = 9,
  filters?: { tag?: string; authorId?: number }
): Promise<number> {
  console.log(`API CALL: Fetching total quote pages, limit ${limit}, filters:`, filters);
  let url = `${API_BASE_URL}/quotes/get-n-pages?page_size=${limit}`;
  if (filters?.authorId) {
    url += `&author_id=${filters.authorId}`;
  }
  const response = await fetch(url);
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

export async function getQuoteById(quoteId: number): Promise<QuotePageEntry | null> {
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
    },
  });
  return handleApiResponse<null>(response, "delete quote");
}

export async function favoriteQuote(quoteId: number): Promise<ApiResponse<null>> {
  console.log(`API CALL: Favoriting quote ${quoteId}`);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/favorite`, {
    method: 'POST',
    headers: {
    },
  });
  return handleApiResponse<null>(response, "favorite quote");
}

export async function unfavoriteQuote(quoteId: number): Promise<ApiResponse<null>> {
  console.log(`API CALL: Unfavoriting quote ${quoteId}`);
  const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/favorite`, {
    method: 'DELETE',
    headers: {
    },
  });
  return handleApiResponse<null>(response, "unfavorite quote");
}


export async function getMyQuotes(token: string): Promise<ApiResponse<QuotePageEntry[]>> {
  console.log("API CALL: Fetching user's quotes.");
  if (!token) {
    console.error("Authentication token is required to fetch user quotes.");
    return {
      success: false,
      message: "Authentication token is required.",
      error: "Authentication token is required.",
    };
  }

  const response = await fetch(`${API_BASE_URL}/quotes/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleApiResponse<QuotePageEntry[]>(response, "fetch user quotes");
}

export async function searchQuotes(searchTerm: string, page: number = 1, limit: number = 9): Promise<PaginatedQuotesResponse> {
  console.log(`API CALL: Searching quotes for '${searchTerm}', page ${page}, limit ${limit}`);
  const response = await fetch(
    `${API_BASE_URL}/quotes/search?query=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Failed to search quotes for '${searchTerm}'`);
  }
  return response.json();
}

export async function generateTags(text: string, author: string): Promise<string[]> {
  console.log(`API CALL: Generating tags for quote text: "${text}", author: "${author}"`);
  const response = await fetch(`${API_BASE_URL}/tags/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quote: text, author: author }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to generate tags" }));
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : "Failed to generate tags due to an unknown error.";
    console.error("Tag generation failed:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data as string[];
}