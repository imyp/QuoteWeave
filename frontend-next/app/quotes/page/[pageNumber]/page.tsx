"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getQuotePage, getPageIndices, type QuotePageEntry, getQuoteTotalPages, PaginatedQuotesResponse, favoriteQuote, unfavoriteQuote } from "@/lib/quote-utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, QuoteIcon, UserCircle2, TagsIcon, SearchIcon, ArrowLeft, Loader2, Heart } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/QuoteDetailModal";

const ITEMS_PER_PAGE = 9;

interface QuoteEntryCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void; // Callback to update quote in parent state
  onOpenModal: () => void; // To trigger modal from parent
}

function QuoteEntryCard({ quote, onOpenModal, onQuoteUpdate }: QuoteEntryCardProps) {
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false); // New state for animation

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent DialogTrigger from firing
    setIsFavoriting(true);
    setAnimateHeart(true); // Trigger animation

    // Reset animation class after it finishes
    // Could also use onAnimationEnd event if preferred, but timeout is simpler here
    setTimeout(() => setAnimateHeart(false), 400);

    try {
      const apiCall = quote.isFavorited ? unfavoriteQuote : favoriteQuote;
      const result = await apiCall(quote.id);
      if (result.success && result.data) {
        onQuoteUpdate(result.data); // Update data in the parent page
      }
    } catch (error) {
      console.error("Failed to update favorite status", error);
      // Optionally show an error to the user
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
          <blockquote className="text-lg italic text-foreground group-hover:text-primary transition-colors">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-3 border-t border-border/50 mt-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <TagsIcon className="h-3.5 w-3.5" />
            {quote.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {quote.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20">
                    {tag}
                  </Badge>
                ))}
                {quote.tags.length > 2 && (
                  <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">+{quote.tags.length - 2}</Badge>
                )}
              </div>
            ) : (
              <span>No tags</span>
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
            <span className="text-xs min-w-[20px] text-right tabular-nums ml-1">{quote.favoriteCount || 0}</span>
          </div>
        </CardFooter>
      </Card>
    </DialogTrigger>
  );
}

export default function QuotesDisplayPage() {
  const router = useRouter();
  const paramsHook = useParams();
  const pageNumberString = paramsHook.pageNumber as string;
  const page = parseInt(pageNumberString || "1", 10);

  const [quotesData, setQuotesData] = useState<PaginatedQuotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);

  const handleQuoteUpdate = (updatedQuote: QuotePageEntry) => {
    setQuotesData(prevData => {
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

  useEffect(() => {
    if (isNaN(page) || page < 1) {
      router.replace('/quotes/page/1');
      return;
    }
    setIsLoading(true);
    setError(null);
    getQuotePage(page, ITEMS_PER_PAGE)
      .then(data => {
        if (page > data.totalPages && data.totalPages > 0) {
          router.replace(`/quotes/page/${data.totalPages}`);
        } else {
          setQuotesData(data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch quotes:", err);
        setError("Failed to load quotes. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [page, router]);

  const pageIndices = useMemo(() => getPageIndices(page, quotesData?.totalPages || 0), [page, quotesData]);

  const handleOpenModal = (quote: QuotePageEntry) => {
    setSelectedQuote(quote);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col min-h-[calc(100vh-4rem)]">
        <h1 className="text-4xl font-bold mb-8 text-center text-foreground">Discover Quotes</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Card key={i} className="bg-card/50 animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-full mb-2"></div><div className="h-4 bg-muted rounded w-5/6"></div></CardContent>
              <CardFooter><div className="h-8 bg-muted rounded w-full"></div></CardFooter>
            </Card>
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
          <AlertTitle>Error Loading Quotes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuote(null); }}>
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)] flex flex-col">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Discover Quotes</h1>
          <p className="mt-2 text-lg text-muted-foreground">Explore a universe of wisdom and inspiration.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow">
          {quotesData?.quotes.map(quote => (
            <QuoteEntryCard
              key={quote.id}
              quote={quote}
              onOpenModal={() => handleOpenModal(quote)}
              onQuoteUpdate={handleQuoteUpdate} // Pass the callback here
            />
          ))}
        </div>

        {quotesData && quotesData.totalPages > 1 && (
          <Pagination className="mt-12 pt-4 border-t border-border">
            <PaginationContent>
              {page > 1 && (
                <PaginationItem>
                  <PaginationPrevious href={`/quotes/page/${page - 1}`} />
                </PaginationItem>
              )}
              {pageIndices.map((value, index) => (
                <PaginationItem key={index}>
                  {value === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink href={`/quotes/page/${value}`} isActive={value === page}>
                      {value}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              {page < quotesData.totalPages && (
                <PaginationItem>
                  <PaginationNext href={`/quotes/page/${page + 1}`} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
        />
      )}
    </Dialog>
  );
}