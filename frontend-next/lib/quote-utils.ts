"use client";

// Placeholder for API functions and types
export interface QuotePageEntry {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  tags: string[];
  isFavorited?: boolean;
  favoriteCount?: number;
}

export interface PaginatedQuotesResponse {
  quotes: QuotePageEntry[];
  currentPage: number;
  totalPages: number;
  totalQuotes: number;
}

// Mock API Response type (consistent with collection-utils)
interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// In-memory store for mock quotes to persist changes
let mockPersistedQuotes: QuotePageEntry[] = Array.from({ length: 50 }, (_, i) => {
  const authorId = `author${(i % 5) + 1}`;
  const authors = ["Eleanor Vance", "Marcus Aurelius", "Seneca", "Epictetus", "Lao Tzu"];
  const tagsPool = ["Inspiration", "Wisdom", "Life Lessons", "Motivation", "Philosophy", "Perseverance", "Success", "Stoicism", "Taoism", "Mindfulness"];
  return {
    id: `quote${i + 1}`,
    authorId,
    authorName: authors[i % 5],
    text: `This is mock quote number ${i + 1} by ${authors[i % 5]}. It explores themes of ${tagsPool[i % tagsPool.length]} and ${tagsPool[(i + 3) % tagsPool.length]}. Some quotes are short, others might be a bit longer to demonstrate how text wrapping and expansion could work within the UI. Consider the fleeting nature of time and the importance of virtue. This is a sample quote text designed for testing purposes. The journey of a thousand miles begins with a single step. Be like water. ${(i%3 ===0) ? 'This quote is deliberately longer to test truncation and show more functionality. It delves deeper into philosophical concepts, encouraging contemplation and introspection. The unexamined life is not worth living, so let us examine our thoughts and actions. ' : ''}`,
    tags: [
      tagsPool[i % tagsPool.length],
      tagsPool[(i + 2) % tagsPool.length],
      tagsPool[(i + 4) % tagsPool.length]
    ].filter((v, idx, self) => self.indexOf(v) === idx), // Unique tags
    isFavorited: Math.random() > 0.7, // Randomly favorite some quotes for mock data
    favoriteCount: Math.floor(Math.random() * 100), // Random favorite count
  };
});

// Exporting allMockQuotes for any part of the app that might still be using it directly during transition.
// Ideally, all data access should go through these API functions.
export const allMockQuotes = mockPersistedQuotes;

export async function getQuotePage(
  page: number,
  limit: number = 9,
  filters?: { tag?: string; authorId?: string }
): Promise<PaginatedQuotesResponse> {
  console.log(`API CALL (mock): Fetching quotes page ${page}, limit ${limit}, filters:`, filters);
  await new Promise(resolve => setTimeout(resolve, 300));

  let filteredQuotesResult = [...mockPersistedQuotes]; // Work with a copy

  if (filters?.tag) {
    filteredQuotesResult = filteredQuotesResult.filter(quote =>
      quote.tags.some(tag => tag.toLowerCase() === filters.tag?.toLowerCase())
    );
  }
  if (filters?.authorId) {
    filteredQuotesResult = filteredQuotesResult.filter(quote => quote.authorId === filters.authorId);
  }

  const totalQuotes = filteredQuotesResult.length;
  const totalPages = Math.ceil(totalQuotes / limit);
  const startIndex = (page - 1) * limit;
  const quotes = filteredQuotesResult.slice(startIndex, startIndex + limit);

  return {
    quotes,
    currentPage: page,
    totalPages,
    totalQuotes,
  };
}

export async function getQuoteTotalPages(
  limit: number = 9,
  filters?: { tag?: string; authorId?: string }
): Promise<number> {
  console.log(`API CALL (mock): Fetching total quote pages, limit ${limit}, filters:`, filters);
  await new Promise(resolve => setTimeout(resolve, 100));

  let filtered = [...mockPersistedQuotes];
  if (filters?.tag) {
    filtered = filtered.filter(quote =>
      quote.tags.some(tag => tag.toLowerCase() === filters.tag?.toLowerCase())
    );
  }
  if (filters?.authorId) {
    filtered = filtered.filter(quote => quote.authorId === filters.authorId);
  }
  return Math.ceil(filtered.length / limit);
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

export async function getQuoteById(quoteId: string): Promise<QuotePageEntry | null> {
  console.log(`API CALL (mock): Fetching quote by ID: ${quoteId}`);
  await new Promise(resolve => setTimeout(resolve, 200));
  const quote = mockPersistedQuotes.find(q => q.id === quoteId);
  return quote || null;
}

export interface NewQuotePayload {
  text: string;
  authorName: string;
  authorId?: string;
  tags: string[];
}

export async function submitNewQuote(payload: NewQuotePayload): Promise<ApiResponse<QuotePageEntry>> {
  console.log("API CALL (mock): Submitting new quote:", payload);
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!payload.text || !payload.authorName) {
    return { success: false, message: "Quote text and author name are required.", error: "missing_fields" };
  }
  if (payload.text.toLowerCase().includes("fail_submission")) { // Test error case
    return { success: false, message: "Failed to submit quote due to content policy (mock).", error: "content_policy_violation" };
  }

  let authorIdToUse = payload.authorId;
  if (!authorIdToUse) {
    const existingAuthor = mockPersistedQuotes.find(q => q.authorName.toLowerCase() === payload.authorName.toLowerCase());
    authorIdToUse = existingAuthor ? existingAuthor.authorId : `author${new Date().getTime()}`;
  }

  const newId = `quote${new Date().getTime()}`;
  const newQuote: QuotePageEntry = {
    id: newId,
    authorId: authorIdToUse,
    authorName: payload.authorName,
    text: payload.text,
    tags: payload.tags || [],
    isFavorited: false,
    favoriteCount: 0,
  };

  mockPersistedQuotes.unshift(newQuote);
  return { success: true, message: "Quote submitted successfully!", data: newQuote };
}

export interface UpdateQuotePayload {
  text?: string;
  authorName?: string;
  tags?: string[];
}

export async function updateQuote(quoteId: string, payload: UpdateQuotePayload): Promise<ApiResponse<QuotePageEntry>> {
  console.log(`API CALL (mock): Updating quote ${quoteId} with:`, payload);
  await new Promise(resolve => setTimeout(resolve, 500));

  const quoteIndex = mockPersistedQuotes.findIndex(q => q.id === quoteId);
  if (quoteIndex === -1) {
    return { success: false, message: "Quote not found.", error: "not_found" };
  }

  if (payload.text && payload.text.toLowerCase().includes("fail_update")) { // Test error case
    return { success: false, message: "Failed to update quote due to content policy (mock).", error: "content_policy_violation" };
  }

  const currentFavoriteStatus = mockPersistedQuotes[quoteIndex].isFavorited;
  const currentFavoriteCount = mockPersistedQuotes[quoteIndex].favoriteCount;

  const updatedQuoteFields = { ...mockPersistedQuotes[quoteIndex], ...payload };

  mockPersistedQuotes[quoteIndex] = {
    ...updatedQuoteFields,
    isFavorited: currentFavoriteStatus,
    favoriteCount: currentFavoriteCount,
  };
  return { success: true, message: "Quote updated successfully!", data: mockPersistedQuotes[quoteIndex] };
}

// New function to delete a quote
export async function deleteQuote(quoteId: string): Promise<ApiResponse> {
  console.log(`API CALL (mock): Deleting quote ${quoteId}`);
  await new Promise(resolve => setTimeout(resolve, 400));

  const initialLength = mockPersistedQuotes.length;
  mockPersistedQuotes = mockPersistedQuotes.filter(q => q.id !== quoteId);

  if (mockPersistedQuotes.length < initialLength) {
    return { success: true, message: "Quote deleted successfully." };
  } else {
    return { success: false, message: "Quote not found or already deleted.", error: "not_found" };
  }
}

// New: Favorite a quote
export async function favoriteQuote(quoteId: string): Promise<ApiResponse<QuotePageEntry>> {
  console.log(`API CALL (mock): Favoriting quote ${quoteId}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const quoteIndex = mockPersistedQuotes.findIndex(q => q.id === quoteId);
  if (quoteIndex === -1) {
    return { success: false, message: "Quote not found.", error: "not_found" };
  }
  if (!mockPersistedQuotes[quoteIndex].isFavorited) {
    mockPersistedQuotes[quoteIndex].isFavorited = true;
    mockPersistedQuotes[quoteIndex].favoriteCount = (mockPersistedQuotes[quoteIndex].favoriteCount || 0) + 1;
  }
  return { success: true, message: "Quote favorited!", data: mockPersistedQuotes[quoteIndex] };
}

// New: Unfavorite a quote
export async function unfavoriteQuote(quoteId: string): Promise<ApiResponse<QuotePageEntry>> {
  console.log(`API CALL (mock): Unfavoriting quote ${quoteId}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const quoteIndex = mockPersistedQuotes.findIndex(q => q.id === quoteId);
  if (quoteIndex === -1) {
    return { success: false, message: "Quote not found.", error: "not_found" };
  }
  if (mockPersistedQuotes[quoteIndex].isFavorited) {
    mockPersistedQuotes[quoteIndex].isFavorited = false;
    mockPersistedQuotes[quoteIndex].favoriteCount = Math.max(0, (mockPersistedQuotes[quoteIndex].favoriteCount || 0) - 1);
  }
  return { success: true, message: "Quote unfavorited.", data: mockPersistedQuotes[quoteIndex] };
}