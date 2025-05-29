'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuotePageEntry, favoriteQuote, unfavoriteQuote, allMockQuotes as globalMockQuotes } from "@/lib/quote-utils";
import { CollectionEntry } from "@/lib/collection-utils";
import { Loader2, SearchIcon, QuoteIcon as LucideQuoteIcon, BookOpenText, Terminal, Heart, TagsIcon, UserCircle2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/QuoteDetailModal";

// Refactor tempSearchQuotes to use globalMockQuotes for consistency
async function tempSearchQuotes(params: { query_string: string, limit: number }): Promise<{ quotes: QuotePageEntry[] }> {
  console.log("Mock API (using global): searchQuotes", params);
  await new Promise(resolve => setTimeout(resolve, 300));

  const query = params.query_string.toLowerCase();
  const filtered = globalMockQuotes.filter(q =>
    q.text.toLowerCase().includes(query) ||
    q.authorName.toLowerCase().includes(query) ||
    q.tags.some(tag => tag.toLowerCase().includes(query))
  ).slice(0, params.limit);

  return { quotes: filtered };
}

interface QuoteResultCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void; // Callback to update quote in parent state
  onOpenModal: () => void;
}

function QuoteResultCard({ quote, onOpenModal, onQuoteUpdate }: QuoteResultCardProps) {
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavoriting(true);
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 400);
    try {
      const apiCall = quote.isFavorited ? unfavoriteQuote : favoriteQuote;
      const result = await apiCall(quote.id);
      if (result.success && result.data) {
        onQuoteUpdate(result.data);
      }
    } catch (error) {
      console.error("Failed to update favorite status", error);
    } finally {
      setIsFavoriting(false);
    }
  };

  return (
    <DialogTrigger asChild>
      <Card
        onClick={onOpenModal}
        className="bg-card/70 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 ease-in-out cursor-pointer group flex flex-col h-full border border-transparent hover:border-primary/30"
      >
        <CardHeader className="pb-3">
          <Link href={`/authors/${quote.authorId}`} onClick={(e) => e.stopPropagation()} className="group/author inline-flex items-center w-fit">
            <UserCircle2 className="h-5 w-5 mr-2 text-muted-foreground group-hover/author:text-primary transition-colors" />
            <CardDescription className="text-sm font-medium text-muted-foreground group-hover/author:text-primary transition-colors">
              {quote.authorName}
            </CardDescription>
          </Link>
        </CardHeader>
        <CardContent className="flex-grow pb-3">
          <blockquote className="text-md italic text-foreground group-hover:text-primary transition-colors line-clamp-4">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-3 border-t border-border/50 mt-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <TagsIcon className="h-3.5 w-3.5" />
            {quote.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {quote.tags.slice(0, 1).map(tag => (
                  <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20">
                    {tag}
                  </Badge>
                ))}
                {quote.tags.length > 1 && (
                  <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">+{quote.tags.length - 1}</Badge>
                )}
              </div>
            ) : (
              <span className="text-xxs">No tags</span>
            )}
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
              onClick={handleFavoriteToggle}
              disabled={isFavoriting}
            >
              <Heart className={`h-4 w-4 ${quote.isFavorited ? 'fill-current' : 'group-hover/fav:fill-red-500/30'} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />
              <span className="sr-only">Favorite</span>
            </Button>
            <span className="text-xs min-w-[18px] text-right tabular-nums ml-1">{quote.favoriteCount || 0}</span>
          </div>
        </CardFooter>
      </Card>
    </DialogTrigger>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'quotes' | 'collections'>('quotes');
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
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    setQuoteResults([]);
    setCollectionResults([]);
    setHasSearched(true);

    try {
      if (searchType === 'quotes') {
        const response = await tempSearchQuotes({ query_string: searchTerm, limit: 10 });
        setQuoteResults(response.quotes);
      } else if (searchType === 'collections') {
        // TODO: Implement collection search
        // For now, simulate finding no collections or a mock collection
        // const mockCollections: CollectionEntry[] = [{ id: 'col1', name: 'My Mock Collection', description: 'A collection about...', isPublic: true, quoteCount: 5, userId: 'user1' }];
        // setResults(mockCollections);
        setCollectionResults([]);
        console.log("Collection search not yet implemented for this view.");
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch search results. Please try again.');
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
                <QuoteResultCard
                  key={`quote-search-${quote.id}`}
                  quote={quote}
                  onOpenModal={() => handleOpenModal(quote)}
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
                    <CardDescription className="text-xs pt-1">{collection.quoteCount} quotes - {collection.isPublic ? 'Public' : 'Private'}</CardDescription>
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