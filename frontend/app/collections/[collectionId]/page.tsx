'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import QuoteDetailModal from '@/components/quote-detail-modal';
import {
  getCollectionById,
  CollectionDetails,
  QuotePageEntry,
  favoriteQuote,
  unfavoriteQuote
} from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, LayersIcon, Loader2, QuoteIcon, TagsIcon, UserCircle, Edit3Icon, Heart, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface CollectionQuoteCardProps {
  quote: QuotePageEntry;
  onOpenModal: () => void;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  authToken: string | null;
  isAuthenticated: boolean;
}

function CollectionQuoteCard({ quote, onOpenModal, onQuoteUpdate, authToken, isAuthenticated }: CollectionQuoteCardProps) {
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);
  const router = useRouter();

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login?message=Please log in to favorite quotes');
      return;
    }
    if (!authToken) {
      console.error("Auth token not available for favoriting.");
      router.push('/login?message=Session expired. Please log in again.');
      return;
    }
    setIsFavoriting(true);
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 600);
    try {
      const apiCall = quote.isFavorited ? unfavoriteQuote : favoriteQuote;
      await apiCall(quote.id, authToken);
      const updatedFavoriteStatus = !quote.isFavorited;
      const updatedFavoriteCount = updatedFavoriteStatus
        ? (quote.favoriteCount || 0) + 1
        : Math.max(0, (quote.favoriteCount || 0) - 1);

      onQuoteUpdate({
        ...quote,
        isFavorited: updatedFavoriteStatus,
        favoriteCount: updatedFavoriteCount,
      });
    } catch (error) {
      console.error("Failed to update favorite status in collection card:", error);
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
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors w-full">
            <UserCircle className="h-4 w-4 mr-1.5" />
            <span className="truncate text-sm" title={quote.authorName || 'Unknown Author'}>{quote.authorName || 'Unknown Author'}</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 flex-grow">
          <blockquote className="text-base italic text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-4">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
        </CardContent>
        <CardFooter className="text-xs p-3 border-t border-border/50 mt-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5 flex-shrink min-w-0">
            <TagsIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {quote.tags && quote.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {quote.tags.slice(0, 1).map(tag => (
                  <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20 truncate">
                    {tag}
                  </Badge>
                ))}
                {quote.tags.length > 1 && (
                  <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">+{quote.tags.length - 1}</Badge>
                )}
              </div>
            ) : (
              <span className="text-xxs italic">No tags</span>
            )}
          </div>
          <div className="flex items-center flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
              onClick={handleFavoriteToggle}
              disabled={isFavoriting || !isAuthenticated}
            >
              <Heart className={`h-4 w-4 ${quote.isFavorited ? 'fill-current' : (isAuthenticated ? 'group-hover/fav:fill-red-500/30' : '')} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />
              <span className="sr-only">Favorite</span>
            </Button>
            <span className="text-xs min-w-[18px] text-right tabular-nums ml-1">{quote.favoriteCount || 0}</span>
          </div>
        </CardFooter>
      </Card>
    </DialogTrigger>
  );
}

export default function CollectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { token: authToken, isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const collectionIdString = params.collectionId as string;

  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleQuoteUpdateInCollection = (updatedQuote: QuotePageEntry) => {
    setCollection(prevCollection => {
      if (!prevCollection) return null;
      return {
        ...prevCollection,
        quotes: prevCollection.quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q),
      };
    });
    if (selectedQuote && selectedQuote.id === updatedQuote.id) {
      setSelectedQuote(updatedQuote);
    }
  };

  useEffect(() => {
    if (!collectionIdString) return;
    const numericCollectionId = parseInt(collectionIdString, 10);
    if (isNaN(numericCollectionId)) {
      console.error("Invalid collection ID:", collectionIdString);
      setError("Invalid collection ID format.");
      setIsLoading(false);
      return;
    }

    if (authIsLoading) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('[CollectionDetailsPage] useEffect - authIsLoading:', authIsLoading, 'isAuthenticated:', isAuthenticated, 'authToken:', authToken ? 'present' : authToken);
    getCollectionById(numericCollectionId, authToken)
      .then(data => {
        if (!data) {
          setError("Hmm, this collection seems to have packed its bags and gone on vacation. Maybe it's sipping a coconut on a digital beach somewhere? We couldn't find it here!");
          setCollection(null);
        } else {
          if (!data.isPublic && (!isAuthenticated || !user || user.id !== data.authorId)) {
            setError("Hmm, this collection seems to have packed its bags and gone on vacation. Maybe it's sipping a coconut on a digital beach somewhere? We couldn't find it here!");
            setCollection(null);
            return;
          }
          console.log('[CollectionDetailsPage] Fetched collection data:', data);
          console.log('[CollectionDetailsPage] Quotes in fetched data:', data.quotes);
          setCollection(data);
        }
      })
      .catch(err => {
        console.error(`Failed to load collection ${numericCollectionId}:`, err);
        const errorMsg = (err instanceof Error ? err.message : String(err)) || "Failed to load collection details.";
        const lowerErrorMsg = errorMsg.toLowerCase();

        if (
          lowerErrorMsg.includes("404") ||
          lowerErrorMsg.includes("not found") ||
          lowerErrorMsg.includes("not authorized") ||
          lowerErrorMsg.includes("unauthorized") ||
          lowerErrorMsg.includes("permission denied") ||
          lowerErrorMsg.includes("permission") ||
          lowerErrorMsg.includes("forbidden") ||
          lowerErrorMsg.includes("access denied")
        ) {
          setError("Hmm, this collection seems to have packed its bags and gone on vacation. Maybe it's sipping a coconut on a digital beach somewhere? We couldn't find it here!");
          setCollection(null);
        } else {
          setError(errorMsg);
        }
      })
      .finally(() => setIsLoading(false));
  }, [collectionIdString, authToken, authIsLoading, isAuthenticated, user, router, params]);

  const handleOpenQuoteModal = (quote: QuotePageEntry) => {
    setSelectedQuote(quote);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <p className="text-xl text-muted-foreground">Loading Collection Details...</p>
        <div className="w-full max-w-3xl mt-8 space-y-4">
          <div className="h-10 bg-muted rounded w-3/4 mx-auto"></div>
          <div className="h-6 bg-muted rounded w-full"></div>
          <div className="h-6 bg-muted rounded w-5/6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && error.startsWith("Hmm, this collection seems to have packed its bags")) {
    return (
      <section className="hero-immersive-grain relative flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 text-center bg-gradient-to-br from-sepia-hero-background-900 via-sepia-hero-background-950 to-sepia-hero-background-950 overflow-hidden">
        <div className="relative z-10 scale-90 flex flex-col items-center">
          <div className="mx-auto mb-8 animate-fadeInUp w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 bg-white/10 p-2 sm:p-2.5 shadow-xl rounded-sm transform rotate-[-5deg] transition-all hover:rotate-[-3deg] hover:scale-[1.02]">
            <div className="bg-white/15 w-full h-full rounded-sm flex items-center justify-center">
              <span className="text-4xl sm:text-5xl text-sepia-hero-text-300">🏝️</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-sepia-hero-text-100 mb-6 animate-fadeInUp delay-200ms">
            Collection Gone on Vacation!
          </h1>
          <p className="text-lg sm:text-xl text-sepia-hero-text-300 max-w-xl md:max-w-2xl mx-auto mb-10 animate-fadeInUp delay-400ms">
            {error}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp delay-600ms">
            <Button onClick={() => router.back()} variant="outline" size="lg" className="font-semibold text-lg border-2 border-sepia-hero-text-400 hover:border-sepia-hero-text-200 text-sepia-hero-text-200 hover:text-sepia-hero-text-100 transition-colors w-full sm:w-auto px-10 py-6">
              <ArrowLeft className="mr-2 h-5 w-5" /> Go Back
            </Button>
            <Link href="/collections" passHref legacyBehavior>
              <Button
                size="lg"
                className="font-semibold text-lg text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto px-10 py-6"
                style={{ backgroundImage: 'var(--gradient-signup-button)' }}
              >
                Explore Other Collections
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error Loading Collection</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
            {!isAuthenticated && error.toLowerCase().includes("permission") && (
              <Button onClick={() => router.push('/login')}>
                <LogIn className="mr-2 h-4 w-4" /> Login to View
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="default" className="max-w-lg">
          <LayersIcon className="h-4 w-4" />
          <AlertTitle>Collection Not Found</AlertTitle>
          <AlertDescription>
            The collection you are looking for does not exist or may have been moved.
            <div className="mt-4">
              <Link href="/collections" className="text-primary hover:underline">
                Browse All Collections
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasQuotes = collection.quotes && collection.quotes.length > 0;

  return (
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuote(null); }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[calc(100vh-4rem)]">
        <header className="mb-10 text-center border-b border-border/50 pb-8 relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/collections')}
            className="absolute top-0 left-0 text-sm md:top-2 md:left-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Collections
          </Button>
          {isAuthenticated && user && collection && user.id === collection.authorId && (
            <div className="absolute top-0 right-0 text-sm md:top-2 md:right-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/collections/${collectionIdString}/edit`)}
              >
                <Edit3Icon className="mr-1.5 h-3.5 w-3.5" /> Edit Collection
              </Button>
            </div>
          )}
          <LayersIcon className="mx-auto h-12 w-12 text-primary mb-3" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl break-words">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {collection.description}
            </p>
          )}
          <div className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-x-4 gap-y-1 flex-wrap">
            <span>
              <QuoteIcon className="inline-block h-4 w-4 mr-1.5 align-middle" />
              {collection.quotes?.length || 0} {(collection.quotes?.length || 0) === 1 ? "Quote" : "Quotes"}
            </span>
            {collection.createdAt && (
              <span>Created: {new Date(collection.createdAt).toLocaleDateString()}</span>
            )}
            <Badge variant={collection.isPublic ? "default" : "secondary"} className="capitalize">
              {collection.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
        </header>

        {hasQuotes ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {collection.quotes.map((quote) => (
              <CollectionQuoteCard
                key={quote.id}
                quote={quote}
                onOpenModal={() => handleOpenQuoteModal(quote)}
                onQuoteUpdate={handleQuoteUpdateInCollection}
                authToken={authToken}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <QuoteIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <p className="text-xl text-muted-foreground">This collection doesn&apos;t have any quotes yet.</p>
          </div>
        )}
      </div>

      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onQuoteUpdate={(updatedQuote) => {
            handleQuoteUpdateInCollection(updatedQuote);
            setSelectedQuote(updatedQuote);
          }}
        />
      )}
    </Dialog>
  );
}