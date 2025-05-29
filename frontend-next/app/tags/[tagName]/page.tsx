'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { getQuotePage, QuotePageEntry, PaginatedQuotesResponse, favoriteQuote, unfavoriteQuote } from '@/lib/quote-utils'; // Added favorite/unfavorite
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TagIcon, Terminal, Loader2, TagsIcon as LucideTagsIcon, ArrowLeft, SearchIcon, Heart, UserCircle2 } from "lucide-react"; // Added Heart, UserCircle2, renamed TagsIcon to LucideTagsIcon
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/QuoteDetailModal";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 9;

interface TaggedQuoteEntryCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  onOpenModal: () => void;
}

function TaggedQuoteEntryCard({ quote, onOpenModal, onQuoteUpdate }: TaggedQuoteEntryCardProps) {
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
      console.error("Failed to update favorite status on tag page card", error);
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
        <CardHeader className="pb-3 pt-4">
            <Link href={`/authors/${quote.authorId}`} onClick={(e) => e.stopPropagation()} className="group/author inline-flex items-center w-fit">
                <UserCircle2 className="h-5 w-5 mr-2 text-muted-foreground group-hover/author:text-primary transition-colors" />
                <CardDescription className="text-sm font-medium text-muted-foreground group-hover/author:text-primary transition-colors">
                    {quote.authorName}
                </CardDescription>
            </Link>
        </CardHeader>
        <CardContent className="flex-grow py-2">
          <blockquote className="text-md italic text-foreground group-hover:text-primary transition-colors line-clamp-4">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-3 px-4 pb-3 border-t border-border/50 mt-auto flex justify-between items-center">
            <div className="flex items-center gap-1.5 flex-shrink min-w-0">
                <LucideTagsIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {quote.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 overflow-hidden">
                    {quote.tags.slice(0, 1).map(tag => (
                         <Link href={`/tags/${tag.toLowerCase().replace(/\s+/g, '-')}`} key={tag} onClick={(e) => e.stopPropagation()}>
                            <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20 truncate">
                                {tag}
                            </Badge>
                        </Link>
                    ))}
                    {quote.tags.length > 1 && (
                        <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">+{quote.tags.length - 1}</Badge>
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

export default function QuotesByTagPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const rawTagNameFromHook = params.tagName as string;
  const tagName = decodeURIComponent(rawTagNameFromHook).replace(/-/g, ' ');

  const [quotesData, setQuotesData] = useState<PaginatedQuotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const handleQuoteUpdateOnPage = (updatedQuote: QuotePageEntry) => {
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

  const handleOpenModal = (quote: QuotePageEntry) => {
    setSelectedQuote(quote);
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    // Use tagName derived from the hook
    getQuotePage(currentPage, ITEMS_PER_PAGE, { tag: tagName })
      .then(data => {
        setQuotesData(data);
        if (currentPage > (data?.totalPages || 0) && (data?.totalPages || 0) > 0) {
          // Use rawTagNameFromHook for router.push to keep URL encoding
          router.push(`/tags/${rawTagNameFromHook}?page=${data.totalPages}`);
        }
      })
      .catch(err => {
        console.error("Failed to load quotes for tag:", err);
        setError("Failed to load quotes. Please try again.");
      })
      .finally(() => setIsLoading(false));
  }, [tagName, currentPage, rawTagNameFromHook, router]); // Use rawTagNameFromHook in dependencies

  const paginationItems = useMemo(() => {
    const totalPages = quotesData?.totalPages || 0;
    if (totalPages <= 1) return [];

    const items = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    if (currentPage - halfVisible < 1) endPage = Math.min(totalPages, maxVisiblePages);
    if (currentPage + halfVisible > totalPages) startPage = Math.max(1, totalPages - maxVisiblePages + 1);

    if (startPage > 1) items.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          {/* Use rawTagNameFromHook for link href */}
          <PaginationLink href={`/tags/${rawTagNameFromHook}?page=${i}`} isActive={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (endPage < totalPages) items.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
    return items;
  }, [currentPage, quotesData?.totalPages, rawTagNameFromHook]); // Use rawTagNameFromHook in dependencies

  const pageTitle = tagName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading quotes for &quot;{pageTitle}&quot;...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Quotes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/tags')} className="mt-6">Back to All Tags</Button>
      </div>
    );
  }

  if (!quotesData || !quotesData.quotes.length) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
        <div className="mb-8 text-center">
          <LucideTagsIcon className="mx-auto h-12 w-12 text-primary mb-3" />
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Quotes Tagged &ldquo;{pageTitle}&rdquo;
          </h1>
        </div>
        <SearchIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4 mt-8" />
        <p className="text-xl text-muted-foreground">No quotes found for the tag &ldquo;{pageTitle}&rdquo;.</p>
        {currentPage > 1 && (
          <Button onClick={() => router.push(`/tags/${rawTagNameFromHook}?page=1`)} className="mt-6">Go to First Page</Button>
        )}
        <Button variant="outline" onClick={() => router.push('/tags')} className="mt-4">View All Tags</Button>
      </div>
    );
  }

  return (
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuote(null); }}>
      <div className="container mx-auto py-8 px-4 md:px-6 flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Link href="/tags" className="text-sm text-primary hover:underline">
            View All Tags
          </Link>
        </div>
        <header className="mb-8 text-center">
          <LucideTagsIcon className="mx-auto h-10 w-10 text-primary mb-2" />
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Quotes Tagged &ldquo;{pageTitle}&rdquo;
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:max-w-xl sm:mx-auto">
            Page {currentPage} of {quotesData?.totalPages || 0}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 flex-grow">
          {quotesData?.quotes.map((quote: QuotePageEntry) => (
            <TaggedQuoteEntryCard
              key={quote.id}
              quote={quote}
              onOpenModal={() => handleOpenModal(quote)}
              onQuoteUpdate={handleQuoteUpdateOnPage}
            />
          ))}
        </div>

        {quotesData.totalPages > 1 && (
          <Pagination className="mt-auto pt-8 pb-4 border-t border-border/50">
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious href={`/tags/${rawTagNameFromHook}?page=${currentPage - 1}`} />
                </PaginationItem>
              )}
              {paginationItems}
              {currentPage < quotesData.totalPages && (
                <PaginationItem>
                  <PaginationNext href={`/tags/${rawTagNameFromHook}?page=${currentPage + 1}`} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
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