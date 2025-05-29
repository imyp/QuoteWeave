'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import QuoteDetailModal from '@/components/QuoteDetailModal';
import { getCollectionDetailsById, CollectionDetails } from "@/lib/collection-utils";
import { QuotePageEntry, favoriteQuote, unfavoriteQuote } from '@/lib/quote-utils'; // Added favorite/unfavorite
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, LayersIcon, Loader2, QuoteIcon, TagsIcon, Terminal, UserCircle, Edit3Icon, Heart } from "lucide-react"; // Added Heart

interface CollectionQuoteCardProps {
  quote: QuotePageEntry;
  onOpenModal: () => void;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
}

function CollectionQuoteCard({ quote, onOpenModal, onQuoteUpdate }: CollectionQuoteCardProps) {
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
      console.error("Failed to update favorite status in collection card", error);
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
                <span className="truncate text-sm" title={quote.authorName}>{quote.authorName}</span>
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
                {quote.tags.length > 0 ? (
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

export default function CollectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params.collectionId as string;

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
        setSelectedQuote(updatedQuote); // Keep modal in sync
    }
  };

  useEffect(() => {
    if (!collectionId) return;
    setIsLoading(true);
    setError(null);
    getCollectionDetailsById(collectionId)
      .then(data => {
        if (!data) {
          notFound();
        } else {
          setCollection(data);
        }
      })
      .catch(err => {
        console.error(`Failed to load collection ${collectionId}:`, err);
        setError("Failed to load collection details. It might have been removed or an error occurred.");
      })
      .finally(() => setIsLoading(false));
  }, [collectionId]);

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
                {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="h-32 bg-muted rounded-lg"></div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Collection</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/collections')} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Collections
        </Button>
      </div>
    );
  }

  if (!collection) {
    // This case should be handled by notFound() but as a fallback:
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
          <div className="absolute top-0 right-0 text-sm md:top-2 md:right-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/collections/${collectionId}/edit`)}
            >
              <Edit3Icon className="mr-1.5 h-3.5 w-3.5" /> Edit Collection
            </Button>
          </div>
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
              {collection.quoteCount} {collection.quoteCount === 1 ? "Quote" : "Quotes"}
            </span>
            <span>Created: {new Date(collection.createdAt).toLocaleDateString()}</span>
            <Badge variant={collection.isPublic ? "default" : "secondary"} className="capitalize">
              {collection.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
        </header>

        {hasQuotes ? (
          <>
            <h2 className="text-3xl font-semibold text-foreground mb-8 text-center">
              Quotes in this Collection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collection.quotes.map(quote => (
                <CollectionQuoteCard
                  key={quote.id}
                  quote={quote}
                  onOpenModal={() => handleOpenQuoteModal(quote)}
                  onQuoteUpdate={handleQuoteUpdateInCollection}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <QuoteIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-xl text-muted-foreground">This collection is currently empty.</p>
            <p className="text-sm text-muted-foreground mt-1">Why not add some inspiration?</p>
             <Button variant="link" className="mt-4 text-primary" asChild>
                <Link href={`/quotes/new?collectionId=${collection.id}`}>Add a Quote</Link>
            </Button>
          </div>
        )}
      </div>

      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onQuoteUpdate={handleQuoteUpdateInCollection}
        />
      )}
    </Dialog>
  );
}