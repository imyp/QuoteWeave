'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, BookCopy, Search, ChevronRight } from "lucide-react";
import { CollectionEntry, searchCollections } from '@/lib/api';
import { useAuth } from "@/lib/auth"; // Import useAuth

// const MOCK_AUTH_TOKEN = "mock-jwt-token-for-dev"; // Removed

export default function CollectionsPage() {
  const { token: authToken, isLoading: authIsLoading } = useAuth(); // Use useAuth hook
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  // Combined loading state: true if either auth is resolving or data is fetching
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false); // Keep for search-specific loading state

  const fetchPublicCollections = useCallback(async (query: string = "") => {
    if (query.trim() !== "") {
        setIsSearching(true); // Indicate search is in progress
        setIsLoading(false); // Main loading might be false if it was a subsequent search
    } else {
        setIsLoading(true); // Initial load or clearing search
        setIsSearching(false);
    }
    setError(null);
    try {
      // Pass authToken (can be null, searchCollections handles it)
      const fetchedCollections = await searchCollections(query, 20, 0, authToken);
      setCollections(fetchedCollections || []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
      setError((err instanceof Error ? err.message : String(err)) || "Failed to load collections.");
      setCollections([]);
    } finally {
      setIsLoading(false); // General loading stops
      setIsSearching(false); // Search-specific loading stops
    }
  }, [authToken]);

  useEffect(() => {
    if (!authIsLoading) { // Only fetch once auth state is resolved
        fetchPublicCollections();
    }
  }, [authIsLoading, fetchPublicCollections]); // Re-fetch if authIsLoading changes (e.g., on initial load)

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // No need to check authIsLoading here for search, fetchPublicCollections handles its own loading states
    fetchPublicCollections(searchTerm);
  };

  const renderCollections = () => {
    if (isLoading && !isSearching) { // Show main loader only on initial load, not during active search spinner
      return (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p>Loading collections...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-6 max-w-lg mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Collections</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (collections.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <BookCopy className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">No collections found.</p>
          {searchTerm && <p className="text-sm">Try adjusting your search term.</p>}
          {!searchTerm && <p className="text-sm">Check back later or create your own!</p>}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <Link key={collection.id} href={`/collections/${collection.id}`} passHref>
            <Card className="bg-card/70 hover:shadow-xl transition-shadow duration-200 ease-in-out cursor-pointer flex flex-col h-full group hover:border-primary/40 border border-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors truncate">{collection.name}</CardTitle>
                {collection.authorName && (
                  <CardDescription className="text-xs">By {collection.authorName}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-1">
                  {collection.description || "No description available."}
                </p>
                 <p className="text-xs text-muted-foreground">{collection.quoteCount || 0} quotes</p>
              </CardContent>
              <CardFooter className="p-4 pt-2 border-t border-border/30 mt-auto">
                 <Button variant="ghost" size="sm" className="w-full justify-between text-primary hover:text-primary/80 px-2">
                    View Collection
                    <ChevronRight className="h-4 w-4 ml-1"/>
                </Button>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 min-h-[calc(100vh-4rem)]">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Discover Collections</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore curated collections of quotes from various authors and topics.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 max-w-xl mx-auto">
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Search collections by name, author, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow text-base"
            disabled={isLoading || isSearching}
          />
          <Button type="submit" disabled={isLoading || isSearching}>
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </form>

      {renderCollections()}
    </div>
  );
}