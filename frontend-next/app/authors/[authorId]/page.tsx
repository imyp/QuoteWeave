'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuotePageEntry, getQuotePage, PaginatedQuotesResponse, favoriteQuote, unfavoriteQuote } from "@/lib/quote-utils";
import { getAuthorDetails, AuthorDetails } from "@/lib/author-utils";
import { Loader2, UserCircle2, BookOpenText, Terminal, ArrowLeft, Heart, TagsIcon } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/QuoteDetailModal";

interface AuthorQuoteCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  onOpenModal: () => void;
}

function AuthorQuoteCard({ quote, onOpenModal, onQuoteUpdate }: AuthorQuoteCardProps) {
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
      console.error("Failed to update favorite status on author page card", error);
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

export default function AuthorPage() {
  const params = useParams();
  const router = useRouter();
  const authorId = params.authorId as string;

  const [authorDetails, setAuthorDetails] = useState<AuthorDetails | null>(null);
  const [authorQuotesData, setAuthorQuotesData] = useState<PaginatedQuotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const QUOTES_PER_PAGE = 6;

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

    setIsLoading(true);
    setError(null);

    Promise.all([
      getAuthorDetails(authorId),
      getQuotePage(currentPage, QUOTES_PER_PAGE, { authorId })
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
  }, [authorId, currentPage, router]);

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
            <UserCircle2 className="h-4 w-4"/>
            <AlertTitle>Author Not Found</AlertTitle>
            <AlertDescription>The author you are looking for does not exist or could not be loaded.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/quotes')} className="mt-6">Browse All Quotes</Button>
      </div>
    );
  }

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
            {authorDetails.bio && (
              <CardDescription className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">
                {authorDetails.bio}
              </CardDescription>
            )}
          </CardHeader>
          {authorQuotesData && (
             <CardFooter className="flex justify-center text-sm text-muted-foreground pb-4 pt-2 border-t border-border/30">
                Displaying {authorQuotesData.quotes.length} of {authorQuotesData.totalQuotes} quotes by this author.
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

        {authorDetails.collections && authorDetails.collections.length > 0 && (
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground">Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {authorDetails.collections.map((collection: any) => (
                <Card key={collection.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-card/80 backdrop-blur-sm hover:border-primary/30 border border-transparent">
                  <CardContent className="p-4 flex-grow flex items-center justify-center">
                    <Link href={`/collections/${collection.id}`} className="block text-center">
                      <h3 className="text-xl font-semibold text-primary hover:underline transition-colors">{collection.name}</h3>
                      {collection.description && <p className="text-xs text-muted-foreground mt-1">{collection.description}</p>}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {selectedQuote && (
            <QuoteDetailModal
                quote={selectedQuote}
                onQuoteUpdate={handleQuoteUpdateOnPage}
            />
        )}
      </div>
    </Dialog>
  );
}