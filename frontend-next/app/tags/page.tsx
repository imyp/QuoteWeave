'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, TagIcon, AlertTriangle, Info } from "lucide-react";
import { TagEntry, searchTags, getAllTagsWithCounts } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function TagsPage() {
  const { token, isLoading: authIsLoading } = useAuth();
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial load / all tags
  const [isSearching, setIsSearching] = useState(false); // For active search
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTags = await getAllTagsWithCounts(token); // Token might be used later
      setTags(fetchedTags || []);
    } catch (err) {
      console.error("Failed to fetch all tags:", err);
      setError((err instanceof Error ? err.message : String(err)) || "Failed to load tags.");
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If search is cleared, fetch all tags again
      fetchAllTags();
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const results = await searchTags(query, 50, 0, token);
      setTags(results || []);
      if (results.length === 0) {
        toast.info("No tags found for your search.");
      }
    } catch (err) {
      console.error("Failed to search tags:", err);
      setError((err instanceof Error ? err.message : String(err)) || "Failed to search tags.");
      setTags([]);
    } finally {
      setIsSearching(false);
    }
  }, [token, fetchAllTags]);

  useEffect(() => {
    if (!authIsLoading) {
      fetchAllTags(); // Fetch all tags on initial load after auth is resolved
    }
  }, [authIsLoading, fetchAllTags]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchTerm.trim()) {
        toast.info("Please enter a search term to find specific tags, or browse all tags below.");
        // Optionally, if they submit empty, explicitly call fetchAllTags if tags are not already loaded
        if (tags.length === 0 && !isLoading) fetchAllTags();
        return;
    }
    performSearch(searchTerm);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    if (newSearchTerm.trim() === '' && !authIsLoading) {
      // If user clears the search, reload all tags
      fetchAllTags();
    }
  };

  const renderContent = () => {
    if (isLoading && !isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p>Loading all tags...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-6 max-w-lg mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (tags.length === 0 && (searchTerm.trim() || !isLoading)) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <Info className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">
            {searchTerm.trim() ? "No tags found for your search." : "No tags available at the moment."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.map((tag) => (
          <Link key={tag.name} href={`/quotes/tags/${encodeURIComponent(tag.name)}`} passHref>
            <Card className="hover:shadow-lg transition-shadow duration-150 ease-in-out cursor-pointer group hover:border-primary/30 border border-transparent">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <TagIcon className="h-5 w-5 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium group-hover:text-primary transition-colors truncate">{tag.name}</span>
                </div>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{tag.quoteCount}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 min-h-[calc(100vh-4rem)]">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Explore Tags</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover quotes by browsing or searching tags. Click on a tag to see related quotes.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-8 max-w-xl mx-auto">
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Search tags by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="flex-grow text-base"
            disabled={authIsLoading || isLoading } // Disable if initial load is happening
          />
          <Button type="submit" disabled={authIsLoading || isSearching || isLoading }>
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </form>
      {renderContent()}
    </div>
  );
}