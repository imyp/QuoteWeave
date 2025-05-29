import { QuotePageEntry, allMockQuotes } from "./quote-utils"; // Added import

export interface CollectionEntry {
  id: string;
  name: string;
  description?: string;
  quoteCount: number;
  author?: string; // Optional: Or perhaps a list of contributing authors
  createdAt: string; // ISO date string
  isPublic: boolean;
}

export interface PaginatedCollectionsResponse {
  collections: CollectionEntry[];
  currentPage: number;
  totalPages: number;
  totalCollections: number;
}

// New type for detailed collection view
export interface CollectionDetails extends CollectionEntry {
  quotes: QuotePageEntry[]; // Add a list of quotes
}

// Payload for updating a collection
export interface UpdateCollectionPayload {
  name: string;
  description?: string;
  isPublic: boolean;
}

// Mock API Response type
interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

// In-memory store for mock collections to persist changes across mock API calls
let mockPersistedCollections: CollectionDetails[] = Array.from({ length: 25 }, (_, i) => {
  const baseId = `col${i + 1}`;
  const initialQuotes = allMockQuotes.slice(i % allMockQuotes.length, (i % allMockQuotes.length) + Math.floor(Math.random() * 3) + 2);
  return {
    id: baseId,
    name: `My Awesome Collection ${i + 1}`,
    description: i % 3 === 0 ? `A curated selection of wonderful insights and thoughts, collection number ${i + 1}. This one has a slightly longer description to test text wrapping.` : `Short and sweet description for collection ${i+1}.`,
    quoteCount: initialQuotes.length,
    author: "Various Authors",
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    isPublic: Math.random() > 0.3,
    quotes: initialQuotes,
  };
});

// Placeholder function to simulate fetching a page of collections
export async function getCollectionPage(page: number, limit: number = 9): Promise<PaginatedCollectionsResponse> {
  console.log(`API CALL (mock): Fetching collections page ${page}, limit ${limit}`);
  await new Promise(resolve => setTimeout(resolve, 300));

  const publicCollections = mockPersistedCollections.filter(c => c.isPublic); // Assuming generic listing shows public

  const totalCollections = publicCollections.length;
  const totalPages = Math.ceil(totalCollections / limit);
  const startIndex = (page - 1) * limit;
  const collectionsForPage = publicCollections.slice(startIndex, startIndex + limit);

  return {
    collections: collectionsForPage.map(({ quotes, ...collectionEntry }) => collectionEntry), // Strip quotes for paginated view
    currentPage: page,
    totalPages,
    totalCollections,
  };
}

// Placeholder function to get total collection pages (if needed separately)
export async function getCollectionTotalPages(limit: number = 9): Promise<number> {
  console.log(`API CALL (mock): Fetching total collection pages, limit ${limit}`);
  await new Promise(resolve => setTimeout(resolve, 100));
  const totalCollections = mockPersistedCollections.filter(c => c.isPublic).length;
  return Math.ceil(totalCollections / limit);
}

// New mock function to get collection details by ID
export async function getCollectionDetailsById(collectionId: string): Promise<CollectionDetails | null> {
  console.log(`API CALL (mock): Fetching details for collection ${collectionId}`);
  await new Promise(resolve => setTimeout(resolve, 400));
  const foundCollection = mockPersistedCollections.find(c => c.id === collectionId);
  return foundCollection || null;
}

// New mock function to update a collection
export async function updateCollection(
  collectionId: string,
  payload: UpdateCollectionPayload
): Promise<ApiResponse<CollectionDetails>> {
  console.log(`API CALL (mock): Updating collection ${collectionId} with payload:`, payload);
  await new Promise(resolve => setTimeout(resolve, 700));

  const collectionIndex = mockPersistedCollections.findIndex(c => c.id === collectionId);

  if (collectionIndex === -1) {
    return { success: false, message: "Collection not found." };
  }

  // Update the collection
  mockPersistedCollections[collectionIndex] = {
    ...mockPersistedCollections[collectionIndex],
    name: payload.name,
    description: payload.description,
    isPublic: payload.isPublic,
    // quoteCount and quotes remain unchanged by this operation
  };

  return {
    success: true,
    message: "Collection updated successfully!",
    data: mockPersistedCollections[collectionIndex],
  };
}

// New mock function to delete a collection
export async function deleteCollection(collectionId: string): Promise<ApiResponse> {
  console.log(`API CALL (mock): Deleting collection ${collectionId}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  const initialLength = mockPersistedCollections.length;
  mockPersistedCollections = mockPersistedCollections.filter(c => c.id !== collectionId);

  if (mockPersistedCollections.length < initialLength) {
    return { success: true, message: "Collection deleted successfully." };
  } else {
    return { success: false, message: "Collection not found or already deleted." };
  }
}

// Mock function to submit a new collection (from previous steps, adapted for persistence)
export async function submitNewCollection(
  payload: Omit<CollectionDetails, 'id' | 'quoteCount' | 'createdAt' | 'quotes'> & { description?: string }
): Promise<ApiResponse<CollectionDetails>> {
  console.log("API CALL (mock): Submitting new collection:", payload);
  await new Promise(resolve => setTimeout(resolve, 700));

  if (!payload.name.trim()) {
    return { success: false, message: "Collection name cannot be empty." };
  }

  const newId = `col${mockPersistedCollections.length + 1 + Math.random().toString(16).slice(2)}`;
  const newCollection: CollectionDetails = {
    id: newId,
    name: payload.name,
    description: payload.description || '',
    isPublic: payload.isPublic,
    quoteCount: 0, // New collections start with 0 quotes
    author: "Current User", // Placeholder
    createdAt: new Date().toISOString(),
    quotes: [], // New collections start with no quotes
  };
  mockPersistedCollections.push(newCollection);
  return { success: true, message: "Collection created successfully!", data: newCollection };
}