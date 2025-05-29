export interface TagEntry {
  id: string;
  name: string;
  quoteCount: number;
  // color?: string; // Optional: for color-coding tags
}

// Placeholder function to simulate fetching all tags
export async function getAllTags(): Promise<TagEntry[]> {
  console.log(`API CALL (mock): Fetching all tags`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const mockTags: TagEntry[] = [
    { id: "tag1", name: "Inspiration", quoteCount: 45 },
    { id: "tag2", name: "Motivation", quoteCount: 62 },
    { id: "tag3", name: "Wisdom", quoteCount: 30 },
    { id: "tag4", name: "Life Lessons", quoteCount: 50 },
    { id: "tag5", name: "Philosophy", quoteCount: 22 },
    { id: "tag6", name: "Humor", quoteCount: 18 },
    { id: "tag7", name: "Perseverance", quoteCount: 35 },
    { id: "tag8", name: "Success", quoteCount: 41 },
    { id: "tag9", name: "Love", quoteCount: 28 },
    { id: "tag10", name: "Art", quoteCount: 15 },
    { id: "tag11", name: "Science", quoteCount: 19 },
    { id: "tag12", name: "History", quoteCount: 25 },
  ].sort((a,b) => b.quoteCount - a.quoteCount); // Sort by popularity

  return mockTags;
}