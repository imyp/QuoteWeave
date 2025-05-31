'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQuoteById, QuotePageEntry, favoriteQuote, unfavoriteQuote, getCurrentUserProfile, UserProfileResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuoteIcon, UserCircle, TagsIcon, Terminal, Edit2Icon, Heart, Loader2, LogIn } from "lucide-react";
import AddToCollectionView from '@/components/quotes/add-to-collection-view';

export default function QuoteDetailsPage() {
  const paramsFromHook = useParams();
  const quoteIdString = paramsFromHook.quoteId as string;
  const router = useRouter();
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [quote, setQuote] = useState<QuotePageEntry | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);
  const [forceQuoteRefetch, setForceQuoteRefetch] = useState(0);

  const numericQuoteId = parseInt(quoteIdString, 10);

  const fetchQuoteDetails = useCallback(() => {
    if (isNaN(numericQuoteId)) {
      setError("Invalid quote ID format.");
      setIsLoading(false);
      notFound();
      return;
    }

    if (authIsLoading) {
        setIsLoading(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    getQuoteById(numericQuoteId, authToken)
      .then(data => {
        if (!data) {
          notFound();
        } else {
          setQuote(data);
        }
      })
      .catch(err => {
        console.error(`Failed to load quote ${numericQuoteId}:`, err);
        setError("Failed to load quote details. It might have been removed or an error occurred.");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericQuoteId, authToken, authIsLoading, forceQuoteRefetch]);

  useEffect(() => {
    if (!quoteIdString) return;
    if (!authIsLoading) {
        fetchQuoteDetails();
    }
  }, [quoteIdString, authIsLoading, fetchQuoteDetails]);

  useEffect(() => {
    if (isAuthenticated && authToken && (!currentUser || forceQuoteRefetch > 0)) { // Also refetch user if forceQuoteRefetch changes
      setIsLoadingUser(true);
      getCurrentUserProfile(authToken)
        .then(profile => {
          setCurrentUser(profile);
        })
        .catch(err => {
          console.error("Failed to fetch user profile:", err);
        })
        .finally(() => setIsLoadingUser(false));
    }
    if (!isAuthenticated) {
      setCurrentUser(null);
    }
  }, [isAuthenticated, authToken, currentUser, forceQuoteRefetch]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quote) return;

    if (!isAuthenticated) {
        router.push(`/login?message=Please log in to favorite quotes&redirect=/quotes/${quote.id}`);
        return;
    }
    if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        return;
    }

    setIsFavoriting(true);
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 600);

    try {
      const apiCall = quote.isFavorited ? unfavoriteQuote : favoriteQuote;
      await apiCall(quote.id, authToken);
      // Optimistic update is fine, but a full refetch might be safer if fav count affects other things
      setQuote(prevQuote => prevQuote ? {
          ...prevQuote,
          isFavorited: !prevQuote.isFavorited,
          favoriteCount: prevQuote.isFavorited
            ? (prevQuote.favoriteCount || 0) - 1
            : (prevQuote.favoriteCount || 0) + 1
      } : null);
    } catch (err) {
      console.error("Failed to update favorite status on details page", err);
      setError("Could not update favorite status. Please try again.");
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleCollectionUpdate = () => {
    setForceQuoteRefetch(prev => prev + 1); // Increment to trigger refetch
  };

  if (isLoading || (authIsLoading && !quote && !error) || (isAuthenticated && isLoadingUser && !currentUser && !quote) ) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading quote...</p>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Quote</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!quote) {
    return (
        <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
         <Alert variant="default" className="max-w-lg">
          <QuoteIcon className="h-4 w-4" />
          <AlertTitle>Quote Not Found</AlertTitle>
          <AlertDescription>
            The quote you are looking for does not exist or may have been moved.
            <div className="mt-4">
                <Link href="/quotes" className="text-primary hover:underline">
                    Browse All Quotes
                </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center">
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center relative pb-4">
          <QuoteIcon className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold text-foreground">Quote Details</CardTitle>
          {isAuthenticated && currentUser && quote.authorId === currentUser.id && (
            <div className="absolute top-4 right-4">
                <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/quotes/${quoteIdString}/edit`)}
                className="text-xs"
                >
                <Edit2Icon className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-6 py-8 text-center">
          <blockquote className="text-xl lg:text-2xl text-foreground leading-relaxed mb-8">
            <p className="whitespace-pre-line">&ldquo;{quote.text}&rdquo;</p>
          </blockquote>
          <div className="flex flex-col items-center space-y-3">
            <Link href={`/authors/${quote.authorId}`} className="group inline-flex items-center justify-center">
              <UserCircle className="h-5 w-5 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <CardDescription className="text-lg text-muted-foreground group-hover:text-primary transition-colors">
                {quote.authorName}
              </CardDescription>
            </Link>
            <div className="flex items-center pt-2">
                <Button
                    variant="ghost"
                    size="lg"
                    className={`group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                    onClick={handleFavoriteToggle}
                    disabled={isFavoriting || isLoading || (!isAuthenticated && !authIsLoading) }
                >
                    {isFavoriting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className={`h-5 w-5 ${quote.isFavorited ? 'fill-current' : (isAuthenticated ? 'group-hover/fav:fill-red-500/30' : '')} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />}
                    <span className="sr-only">Favorite</span>
                </Button>
                <span className="text-base text-muted-foreground tabular-nums ml-2">{quote.favoriteCount || 0} favorites</span>
            </div>
            {!isAuthenticated && !authIsLoading && (
                <div className="mt-4 text-sm text-muted-foreground">
                    <Link href={`/login?message=Log in to favorite this quote&redirect=/quotes/${quote.id}`} className="text-primary hover:underline flex items-center justify-center">
                        <LogIn className="mr-1.5 h-4 w-4" /> Log in to Favorite
                    </Link>
                </div>
            )}
          </div>
        </CardContent>
        {isAuthenticated && numericQuoteId && quote && currentUser && (
            <div className="px-6 pb-6">
                <AddToCollectionView
                    quote={quote}
                    userId={currentUser.id}
                    authToken={authToken}
                    onCollectionUpdate={handleCollectionUpdate}
                />
            </div>
        )}
        {quote.tags && quote.tags.length > 0 && (
          <CardFooter className="flex flex-col items-center gap-4 pt-6 pb-8 border-t border-border/50">
            <div className="flex items-center text-muted-foreground mb-2">
                <TagsIcon className="h-5 w-5 mr-2" />
                <h3 className="text-sm font-medium uppercase tracking-wider">Tags</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {quote.tags.map(tag => (
                <Link href={`/quotes/tags/${tag.toLowerCase().replace(/\s+/g, '-')}`} key={tag}>
                  <Badge variant="secondary" className="text-sm px-3 py-1 hover:bg-primary/20 transition-colors cursor-pointer">
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}