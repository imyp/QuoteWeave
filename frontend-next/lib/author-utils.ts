'use client';

import { QuotePageEntry, allMockQuotes } from './quote-utils'; // Assuming allMockQuotes is exported from quote-utils

export interface AuthorDetails {
  id: string;
  name: string;
  bio?: string;
  quotes: QuotePageEntry[]; // Using the existing QuotePageEntry type
  collections: any[]; // Define a Collection stub or import if available
  // Add other relevant author details here, e.g., birthDate, deathDate, nationality
}

// Mock data for authors
const mockAuthors: AuthorDetails[] = [
  {
    id: 'author1',
    name: 'Eleanor Vance',
    bio: 'A renowned philosopher and writer, known for her insightful works on ethics and human nature. Her writings often explore the complexities of modern life through a classical lens.',
    quotes: allMockQuotes.filter((q: QuotePageEntry) => q.authorId === 'author1'),
    collections: [
      { id: 'col-ev-1', name: 'On Virtue', description: 'A collection of thoughts on moral excellence.' },
      { id: 'col-ev-2', name: 'Modern Musings', description: 'Reflections on contemporary issues.' }
    ]
  },
  {
    id: 'author2',
    name: 'Marcus Aurelius',
    bio: 'Roman Emperor from 161 to 180 AD and a Stoic philosopher. His work \"Meditations\" is a significant source of the modern understanding of ancient Stoic philosophy.',
    quotes: allMockQuotes.filter((q: QuotePageEntry) => q.authorId === 'author2'),
    collections: [
      { id: 'col-ma-1', name: 'Stoic Principles', description: 'Key tenets of Stoicism.' }
    ]
  },
  {
    id: 'author3',
    name: 'Seneca',
    bio: 'Lucius Annaeus Seneca, often known as Seneca the Younger, was a Roman Stoic philosopher, statesman, dramatist, and in one work, satirist, from the Silver Age of Latin literature.',
    quotes: allMockQuotes.filter((q: QuotePageEntry) => q.authorId === 'author3'),
    collections: []
  },
  {
    id: 'author4',
    name: 'Epictetus',
    bio: 'A Greek Stoic philosopher. He was born a slave at Hierapolis, Phrygia (present day Pamukkale, Turkey) and lived in Rome until his banishment, when he went to Nicopolis in northwestern Greece for the rest of his life.',
    quotes: allMockQuotes.filter((q: QuotePageEntry) => q.authorId === 'author4'),
    collections: []
  },
  {
    id: 'author5',
    name: 'Lao Tzu',
    bio: 'An ancient Chinese philosopher and writer. He is the reputed author of the Tao Te Ching, the founder of philosophical Taoism, and a deity in religious Taoism and traditional Chinese religions.',
    quotes: allMockQuotes.filter((q: QuotePageEntry) => q.authorId === 'author5'),
    collections: []
  },
  // Add more mock authors if needed by matching authorIds from quote-utils
];

export async function getAuthorDetails(authorId: string): Promise<AuthorDetails | null> {
  console.log(`API CALL (mock): Fetching details for author ID: ${authorId}`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

  const author = mockAuthors.find(a => a.id === authorId);
  if (author) {
    // Simulate also fetching a few quotes specifically for this author for the details page if not already embedded
    // For this mock, quotes are already filtered in mockAuthors definition
    return author;
  } else {
    // Try to find by numeric ID if that was the old way
    const numericIdAuthor = mockAuthors.find(a => a.id === `author${authorId}`);
    if (numericIdAuthor) return numericIdAuthor;
    return null; // Author not found
  }
}

// Mock function to get author info by numeric ID (to help with transition from old code)
// This is just for the AuthorPage that was using parseInt on authorId
export async function getAuthorInfo(authorId: number): Promise<AuthorDetails | null> {
    console.log(`API CALL (mock): Fetching details for author numeric ID: ${authorId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const author = mockAuthors.find(a => a.id === `author${authorId}`);
    return author || null;
}