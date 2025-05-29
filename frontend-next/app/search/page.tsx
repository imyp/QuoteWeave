'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { searchQuotesSemantic, type QuotePageEntry, searchCollections } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { type CollectionEntry } from "@/lib/api";
import { Loader2, SearchIcon, QuoteIcon as LucideQuoteIcon, BookOpenText, Terminal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/quote-detail-modal";
import QuoteCard from "@/components/quote-card";

export default function SearchPage() {
  const { token, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, /* setSearchType */] = useState<'quotes' | 'collections'>('quotes');
  const [quoteResults, setQuoteResults] = useState<QuotePageEntry[]>([]);
  const [collectionResults, setCollectionResults] = useState<CollectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);

  const handleQuoteUpdateInSearch = (updatedQuote: QuotePageEntry) => {
    setQuoteResults(prevResults =>
      prevResults.map(q => q.id === updatedQuote.id ? updatedQuote : q)
    );
    if (selectedQuote && selectedQuote.id === updatedQuote.id) {
      setSelectedQuote(updatedQuote);
    }
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!searchTerm.trim()) {
      toast.info("Please enter a search term.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuoteResults([]);
    setCollectionResults([]);
    setHasSearched(true);

    try {
      if (searchType === 'quotes') {
        const results = await searchQuotesSemantic(searchTerm, 20, 0, isAuthenticated ? token : null);
        setQuoteResults(results);
        if (results.length === 0 && searchTerm.trim()) {
          toast.info("No quotes found for your search.");
        }
      } else if (searchType === 'collections') {
        const results = await searchCollections(searchTerm, 20, 0, isAuthenticated ? token : null);
        setCollectionResults(results);
        if (results.length === 0 && searchTerm.trim()) {
          toast.info("No collections found for your search.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch search results. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (quote: QuotePageEntry) => {
    setSelectedQuote(quote);
  };

  const currentResults = searchType === 'quotes' ? quoteResults : collectionResults;

  return (
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuote(null); }}>
      <div className="container mx-auto py-8 px-4 md:px-6 min-h-[calc(100vh-4rem)]">
        <div className="mb-10 text-center">
          <SearchIcon className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Search QuoteWeave
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
            Find quotes and collections by keywords, authors, or tags.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter keyword, author, or tag..."
            className="w-full sm:max-w-lg text-base bg-input/70"
            aria-label="Search term"
          />
          <Button type="submit" className="font-semibold w-full sm:w-auto" disabled={isLoading} style={{ backgroundImage: 'var(--gradient-primary-button)' }}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <SearchIcon className="mr-2 h-5 w-5" />}
            Search {searchType === 'quotes' ? 'Quotes' : 'Collections'}
          </Button>
        </form>

        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Searching...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="max-w-lg mx-auto my-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Search Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasSearched && !isLoading && !error && currentResults.length === 0 && (
          <div className="text-center py-12">
            <LucideQuoteIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No {searchType === 'quotes' ? 'quotes' : 'collections'} found for &quot;{searchTerm}&quot;.</p>
            <p className="text-sm text-muted-foreground mt-2">Try a different search term or check your spelling.</p>
          </div>
        )}

        {currentResults.length > 0 && !isLoading && !error && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-center text-foreground">
              Results for &quot;{searchTerm}&quot;
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchType === 'quotes' && quoteResults.map(quote => (
                <QuoteCard
                  key={`quote-search-${quote.id}`}
                  quote={quote}
                  onOpenModal={handleOpenModal}
                  onQuoteUpdate={handleQuoteUpdateInSearch}
                />
              ))}
              {searchType === 'collections' && collectionResults.map(collection => (
                <Card key={collection.id} className="bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in-out flex flex-col h-full border border-transparent hover:border-primary/30">
                  <CardHeader>
                    <Link href={`/collections/${collection.id}`} passHref>
                      <CardTitle className="text-xl font-semibold text-foreground hover:text-primary transition-colors group flex items-center">
                        <BookOpenText className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        {collection.name}
                      </CardTitle>
                    </Link>
                    <CardDescription className="text-xs pt-1">
                      By: {collection.authorName} - {collection.quoteCount} quotes - {collection.isPublic ? 'Public' : 'Private'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">{collection.description}</p>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-border/50 mt-auto">
                    <Link href={`/collections/${collection.id}`} passHref>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 px-0 text-sm">
                        View Collection
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {selectedQuote && searchType === 'quotes' && (
          <QuoteDetailModal
            quote={selectedQuote}
            onQuoteUpdate={handleQuoteUpdateInSearch}
          />
        )}

      </div>
    </Dialog>
  );
}