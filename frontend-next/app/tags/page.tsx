'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link'; // For linking to pages showing quotes for a specific tag
import { Badge } from '@/components/ui/badge';
import { getAllTags, TagEntry } from '@/lib/tag-utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TagIcon, Terminal } from "lucide-react" // Using TagIcon for aesthetics

export default function TagsPage() {
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getAllTags()
      .then(data => {
        setTags(data);
      })
      .catch(err => {
        console.error("Failed to load tags:", err);
        setError("Failed to load tags. Please try again later.");
      })
      .finally(() => setIsLoading(false));
  }, []);

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
        <p className="text-muted-foreground">It seems there are no tags available right now.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Explore Tags</h1>
        <p className="mt-2 text-lg text-muted-foreground">Discover quotes by browsing through popular and relevant tags.</p>
      </header>

      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5">
        {tags.map(tag => (
          <Link href={`/tags/${tag.name.toLowerCase().replace(/\s+/g, '-')}`} key={tag.id}>
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
        ))}
      </div>
    </div>
  );
}