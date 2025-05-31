'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuoteIcon, Terminal, Loader2, ArrowLeft } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getPageIndices } from "@/lib/quote-utils";
import { QuotePageEntry, searchQuotesByTag } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import QuoteCard from '@/components/quote-card';
import QuoteDetailModal from '@/components/quote-detail-modal';
import { Dialog } from "@/components/ui/dialog";

export default function TaggedQuotesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: authToken, isLoading: authIsLoading } = useAuth();

  const tag = params.tag as string;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [quotes, setQuotes] = useState<QuotePageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<QuotePageEntry | null>(null);

  const fetchTaggedQuotes = useCallback(async (pageToFetch: number) => {
    if (!tag) {
      setError("Tag not specified.");
      setIsLoading(false);
      return;
    }

    if (authIsLoading) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchQuotesByTag(tag, pageToFetch, 10, authToken);
      if (result.quotes) {
        setQuotes(result.quotes);
      }
      if (result.totalPages) {
        setTotalPages(result.totalPages);
      }
      if (!result.quotes || result.quotes.length === 0) {
      }

    } catch (err) {
      console.error(`Failed to load quotes for tag ${tag}:`, err);
      setError((err instanceof Error ? err.message : String(err)) || "Failed to load quotes for this tag.");
      if (err instanceof Error && err.message.includes("404")) {
        notFound();
      }
    } finally {
      setIsLoading(false);
    }
  }, [tag, authToken, authIsLoading]);

  useEffect(() => {
    if (tag) {
        fetchTaggedQuotes(currentPage);
    }
  }, [fetchTaggedQuotes, tag, currentPage]);

  const handleQuoteUpdate = (updatedQuote: QuotePageEntry) => {
    setQuotes(currentQuotes =>
      currentQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q)
    );
  };

  const handleOpenModal = (quote: QuotePageEntry) => {
    setSelectedQuoteForModal(quote);
  };

  const handleCloseModal = () => {
    setSelectedQuoteForModal(null);
  };

  const pageIndices = getPageIndices(currentPage, totalPages);

  if (isLoading || (authIsLoading && !error && !quotes.length)) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading quotes for &quot;{tag}&quot;...</p>
      </div>
    );
  }

  if (error && !quotes.length) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Quotes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!quotes.length) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="default" className="max-w-lg mb-4">
          <QuoteIcon className="h-4 w-4" />
          <AlertTitle>No Quotes Found</AlertTitle>
          <AlertDescription>
            No quotes found for the tag &quot;{tag}&quot;.
            <div className="mt-4">
              <Link href="/quotes" className="text-primary hover:underline">
                Browse All Quotes
              </Link>
            </div>
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          Quotes tagged with <Badge variant="secondary" className="text-2xl ml-2">{tag}</Badge>
        </h1>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onQuoteUpdate={handleQuoteUpdate}
            onOpenModal={handleOpenModal}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination className="mt-12 pt-4 border-t border-border">
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious href={`/quotes/tags/${tag}?page=${currentPage - 1}`} />
              </PaginationItem>
            )}
            {pageIndices.map((value, index) => (
              <PaginationItem key={index}>
                {value === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink href={`/quotes/tags/${tag}?page=${value}`} isActive={value === currentPage}>
                    {value}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext href={`/quotes/tags/${tag}?page=${currentPage + 1}`} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
      {selectedQuoteForModal && (
        <Dialog open={!!selectedQuoteForModal} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
          <QuoteDetailModal
            quote={selectedQuoteForModal}
            onQuoteUpdate={handleQuoteUpdate}
          />
        </Dialog>
      )}
    </div>
  );
}