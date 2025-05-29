'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TagIcon, Terminal, Construction } from "lucide-react"; // Added TagIcon, Construction
import { getAllTagsWithCounts, TagEntry } from "@/lib/api"; // Updated import
import { useAuth } from '@/lib/auth'; // Added useAuth for token

export default function TagsPage() {
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth(); // Get token for API call

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getAllTagsWithCounts(token) // Use the new API function with token
      .then(data => {
        setTags(data);
      })
      .catch(err => {
        console.error("Failed to load tags:", err);
        setError("Failed to load tags. Please try again later.");
      })
      .finally(() => setIsLoading(false));
  }, [token]); // Add token to dependency array

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center">
        <div className="animate-pulse space-y-4 w-full max-w-xl mb-10">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 w-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-muted rounded-full animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Tags</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tags.length && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
        <TagIcon className="w-16 h-16 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">No Tags Found</h1>
        <p className="text-muted-foreground">It seems there are no tags available right now. Try adding some quotes with tags!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Explore Tags</h1>
        <p className="mt-2 text-lg text-muted-foreground">Discover quotes by browsing through popular and relevant tags.</p>
      </header>

      {/* Main content area for tag cloud */}
      <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 md:gap-5 p-6 bg-card/50 rounded-lg shadow-sm min-h-[200px]">
        {tags.length > 0 ? (
          tags.map(tag => (
            <Link href={`/quotes/tagged/${encodeURIComponent(tag.name.toLowerCase().replace(/\s+/g, '-'))}`} key={tag.name}>
              <Badge
                variant="outline"
                className="px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base rounded-full cursor-pointer
                           border-border/70 hover:border-primary/80 bg-card/60 hover:bg-accent/70
                           transition-all duration-200 ease-in-out hover:shadow-md hover:shadow-primary/10
                           transform hover:scale-105 focus:ring-2 focus:ring-primary/50 focus:outline-none"
              >
                {tag.name}
                <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">
                  {tag.quoteCount}
                </span>
              </Badge>
            </Link>
          ))
        ) : (
          // This case should ideally be covered by the 'No Tags Found' block above,
          // but kept as a fallback within the main content area.
          <div className="flex flex-col items-center justify-center text-center py-10">
            <Construction className="w-16 h-16 text-primary mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-3">Tag Cloud Loading or Empty</h2>
            <p className="text-muted-foreground max-w-md">
              If you see this for a while, there might be no tags or an issue loading them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}