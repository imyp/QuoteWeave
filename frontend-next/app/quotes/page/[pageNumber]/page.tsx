"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import Link from "next/link";
import { useParams, useRouter } from 'next/navigation';
import { getPageIndices } from "@/lib/quote-utils";
import { getQuotesPage, type QuotePageEntry as ApiQuotePageEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, UserCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/quote-detail-modal";
import QuoteCard from "@/components/quote-card";

const ITEMS_PER_PAGE = 9;

export default function QuotesDisplayPage() {
  const router = useRouter();
  const paramsHook = useParams();
  const { token, isLoading: authIsLoading } = useAuth();
  const pageNumberString = paramsHook.pageNumber as string;
  const page = parseInt(pageNumberString || "1", 10);

  const [quotesData, setQuotesData] = useState<ApiQuotePageEntry[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<ApiQuotePageEntry | null>(null);

  const handleQuoteUpdate = (updatedQuote: ApiQuotePageEntry) => {
    setQuotesData(prevQuotes =>
      prevQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q)
    );
    if (selectedQuote && selectedQuote.id === updatedQuote.id) {
      setSelectedQuote(updatedQuote);
    }
  };

  useEffect(() => {
    if (authIsLoading) return;

    if (isNaN(page) || page < 1) {
      router.replace('/quotes/page/1');
      return;
    }
    setIsLoading(true);
    setError(null);

    getQuotesPage(page, token)
      .then(data => {
        if (data && data.quotes) {
          setQuotesData(data.quotes);
          setTotalPages(data.totalPages || 0);

          if (page > (data.totalPages || 0) && (data.totalPages || 0) > 0) {
            router.replace(`/quotes/page/${data.totalPages}`);
          }
        } else {
          setQuotesData([]);
          setTotalPages(0);
        }
      })
      .catch(err => {
        console.error("Failed to fetch quotes:", err);
        setError(err.message || "Failed to load quotes. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [page, router, token, authIsLoading]);

  const pageIndices = useMemo(() => getPageIndices(page, totalPages), [page, totalPages]);

  const handleOpenModal = (quote: ApiQuotePageEntry) => {
    setSelectedQuote(quote);
  };

  if (isLoading || authIsLoading) {
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

        {quotesData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow">
            {quotesData.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onOpenModal={handleOpenModal}
                onQuoteUpdate={handleQuoteUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <UserCircle2 className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No quotes found on this page.</p>
            {page > 1 && (
              <Button asChild variant="link" className="mt-4">
                <Link href={`/quotes/page/${page - 1}`}>Go to Previous Page</Link>
              </Button>
            )}
          </div>
        )}

        {totalPages > 1 && (
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
              {page < totalPages && (
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