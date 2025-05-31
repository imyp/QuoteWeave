'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuotePageEntry, getQuotePage, PaginatedQuotesResponse } from "@/lib/quote-utils";
import { getAuthorDetails, AuthorDetailsResponse, CollectionEntry, favoriteQuote, unfavoriteQuote } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Loader2, UserCircle2, BookOpenText, Terminal, ArrowLeft, Heart, TagsIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/quote-detail-modal";

interface AuthorQuoteCardProps {
  quote: QuotePageEntry;
  onOpenModal: () => void;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  token: string | null;
  isAuthenticated: boolean;
  authIsLoading: boolean;
}

function AuthorQuoteCard({ quote: initialQuote, onOpenModal, onQuoteUpdate, token, isAuthenticated, authIsLoading }: AuthorQuoteCardProps) {
  const [quote, setQuote] = useState<QuotePageEntry>(initialQuote);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    setQuote(prevQuote => {
      const baseState = { ...initialQuote };
      const updatedQuote = !isAuthenticated && baseState.isFavorited === true
        ? { ...baseState, isFavorited: false, favoriteCount: Math.max(0, (baseState.favoriteCount || 0) - 1) }
        : baseState;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return prevQuote.id === updatedQuote.id ? { ...updatedQuote, _animateHeart: (prevQuote as any)._animateHeart } : updatedQuote;
    });
  }, [initialQuote, isAuthenticated]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authIsLoading) return;

    if (!isAuthenticated || !token) {
      console.log("Please log in to favorite quotes.");
      return;
    }

    setIsFavoriting(true);
    setAnimateHeart(true);

    const originalQuoteState = { ...quote };
    const newFavoriteStatus = !quote.isFavorited;
    const newFavoriteCount = newFavoriteStatus
      ? (quote.favoriteCount || 0) + 1
      : Math.max(0, (quote.favoriteCount || 0) - 1);

    // Optimistic update
    const optimisticallyUpdatedQuote = {
      ...quote,
      isFavorited: newFavoriteStatus,
      favoriteCount: newFavoriteCount,
    };
    setQuote(optimisticallyUpdatedQuote);
    onQuoteUpdate(optimisticallyUpdatedQuote); // Notify parent for its state

    try {
      if (newFavoriteStatus) {
        await favoriteQuote(quote.id, token);
      } else {
        await unfavoriteQuote(quote.id, token);
      }
    } catch (error) {
      console.error("Failed to update favorite status on author page card", error);
      setQuote(originalQuoteState);
      onQuoteUpdate(originalQuoteState);
    } finally {
      setIsFavoriting(false);
      setTimeout(() => setAnimateHeart(false), 400);
    }
  };

  return (
    <Card
      onClick={onOpenModal}
      className="bg-card/70 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 ease-in-out cursor-pointer group flex flex-col h-full border border-transparent hover:border-primary/30"
    >
      <CardContent className="p-4 flex-grow overflow-y-auto">
        <blockquote className="text-md text-foreground italic group-hover:text-primary transition-colors mb-3 leading-relaxed line-clamp-4">
          &ldquo;{quote.text}&rdquo;
        </blockquote>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-3 px-4 pb-3 border-t border-border/50 mt-auto flex justify-between items-center">
        <div className="flex items-center gap-1.5 flex-shrink min-w-0">
          <TagsIcon className="h-3.5 w-3.5 flex-shrink-0" />
          {quote.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {quote.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20 truncate">
                  {tag}
                </Badge>
              ))}
              {quote.tags.length > 2 && (
                <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">+{quote.tags.length - 2}</Badge>
              )}
            </div>
          ) : (
            <span className="text-xxs italic">No tags</span>
          )}
        </div>
        <div className="flex items-center flex-shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
            onClick={handleFavoriteToggle}
            disabled={isFavoriting || authIsLoading || !isAuthenticated}
          >
            {isFavoriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${quote.isFavorited ? 'fill-current' : 'group-hover/fav:fill-red-500/30'} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />}
            <span className="sr-only">Favorite</span>
          </Button>
          <span className="text-xs min-w-[18px] text-right tabular-nums ml-1">{quote.favoriteCount || 0}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function AuthorPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const authorId = params.authorId as string;

  const [authorDetails, setAuthorDetails] = useState<AuthorDetailsResponse | null>(null);
  const [authorQuotesData, setAuthorQuotesData] = useState<PaginatedQuotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);
  const [currentPage,] = useState(1);
  const QUOTES_PER_PAGE = 6;
  const numericAuthorId = parseInt(authorId, 10);

  const handleQuoteUpdateOnPage = (updatedQuote: QuotePageEntry) => {
    setAuthorQuotesData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        quotes: prevData.quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q),
      };
    });
    if (selectedQuote && selectedQuote.id === updatedQuote.id) {
      setSelectedQuote(updatedQuote);
    }
  };

  const handleOpenModal = (quote: QuotePageEntry) => {
    setSelectedQuote(quote);
  };

  useEffect(() => {
    if (!authorId) {
      setError("Author ID is missing.");
      setIsLoading(false);
      return;
    }
    if (isNaN(numericAuthorId)) {
      setError("Invalid Author ID format.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      getAuthorDetails(numericAuthorId),
      getQuotePage(currentPage, QUOTES_PER_PAGE, { authorId: numericAuthorId })
    ])
      .then(([details, quotesResponse]) => {
        if (!details) {
          setError("Author not found.");
        } else {
          setAuthorDetails(details);
        }
        setAuthorQuotesData(quotesResponse);
      })
      .catch(err => {
        console.error("Error fetching author page data:", err);
        setError(err.message || "Failed to load author information and quotes.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authorId, currentPage, router, numericAuthorId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading author details...</p>
      </div>
    );
  }

  if (error && !authorDetails) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Author</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
      </div>
    );
  }

  if (!authorDetails) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center min-h-[calc(100vh-8rem)]">
        <Alert className="max-w-md mx-auto">
          <UserCircle2 className="h-4 w-4" />
          <AlertTitle>Author Not Found</AlertTitle>
          <AlertDescription>The author you are looking for does not exist or could not be loaded.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/quotes')} className="mt-6">Browse All Quotes</Button>
      </div>
    );
  }

  const isCurrentUserAuthor = isAuthenticated && user && user.id === authorDetails.id;

  const collectionsToDisplay = authorDetails.collections
    ? (isCurrentUserAuthor
        ? authorDetails.collections
        : authorDetails.collections.filter(c => c.isPublic))
    : [];

  return (
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuote(null); }}>
      <div className="container mx-auto py-8 px-4 md:px-6 min-h-[calc(100vh-4rem)]">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6 text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="mb-10 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <UserCircle2 className="mx-auto h-16 w-16 text-primary mb-3" />
            <CardTitle className="text-4xl font-bold text-foreground">{authorDetails.name}</CardTitle>
          </CardHeader>
          {authorQuotesData && authorDetails && authorDetails.quotes && (
            <CardFooter className="flex justify-center text-sm text-muted-foreground pb-4 pt-2 border-t border-border/30">
              Displaying {authorQuotesData.quotes.length} of {authorDetails.quotes.length} quotes by this author.
            </CardFooter>
          )}
        </Card>

        {error && authorDetails && (
          <Alert variant="destructive" className="my-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error Loading Quotes</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-6 text-foreground flex items-center">
            <BookOpenText className="mr-3 h-7 w-7 text-primary" /> Quotes
          </h2>
          {authorQuotesData && authorQuotesData.quotes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {authorQuotesData.quotes.map((quote: QuotePageEntry) => (
                <AuthorQuoteCard
                  key={quote.id}
                  quote={quote}
                  onOpenModal={() => handleOpenModal(quote)}
                  onQuoteUpdate={handleQuoteUpdateOnPage}
                  token={token}
                  isAuthenticated={isAuthenticated}
                  authIsLoading={authIsLoading}
                />
              ))}
            </div>
          ) : (
            !isLoading && !error && (
              <p className="text-muted-foreground italic">
                No quotes found for {authorDetails.name} on this page.
              </p>
            )
          )}
        </div>

        {authorDetails.collections && (
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground">Collections</h2>
            {collectionsToDisplay.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collectionsToDisplay.map((collectionSimple) => {
                  const collectionEntry: CollectionEntry = {
                    id: collectionSimple.id,
                    name: collectionSimple.name,
                    description: undefined,
                    isPublic: collectionSimple.isPublic,
                    authorId: authorDetails.id,
                    authorName: authorDetails.name,
                    quoteCount: collectionSimple.quoteCount,
                  };
                  return (
                    <Card key={collectionEntry.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-card/80 backdrop-blur-sm hover:border-primary/30 border border-transparent">
                      <CardHeader className="pb-2 pt-4">
                        <Link href={`/collections/${collectionEntry.id}`} passHref>
                          <CardTitle className="text-lg font-semibold hover:text-primary transition-colors truncate cursor-pointer">
                            {collectionEntry.name}
                          </CardTitle>
                        </Link>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm text-muted-foreground flex-grow">
                        {collectionEntry.description && (
                          <p className="line-clamp-2 mb-2">
                            {collectionEntry.description}
                          </p>
                        )}
                        <Badge variant={collectionEntry.isPublic ? "default" : "secondary"} className="capitalize text-xs">
                          {collectionEntry.isPublic ? "Public" : "Private"}
                        </Badge>
                      </CardContent>
                      <CardFooter className="text-xs p-3 border-t border-border/50 mt-auto flex justify-between items-center">
                        {collectionEntry.isPublic ? (
                          <span>{collectionEntry.quoteCount} {collectionEntry.quoteCount === 1 ? "quote" : "quotes"}</span>
                        ) : (
                          <span className="italic">Private collection</span>
                        )}
                        <Link href={`/collections/${collectionEntry.id}`} passHref>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 h-auto p-0 text-xs">View</Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              !isCurrentUserAuthor && authorDetails.collections.length > 0 && (
                <p className="text-muted-foreground italic">
                  {authorDetails.name} has no public collections.
                </p>
              )
            )}
          </div>
        )}
      </div>

      {selectedQuote && (
        <QuoteDetailModal
          quote={{
            ...selectedQuote,
          }}
          onQuoteUpdate={(updatedApiQuote) => {
            const { ...restOfQuote } = updatedApiQuote;
            handleQuoteUpdateOnPage({
              ...restOfQuote,
              authorId: selectedQuote.authorId,
              authorName: selectedQuote.authorName,
            });
          }}
        />
      )}
    </Dialog>
  );
}