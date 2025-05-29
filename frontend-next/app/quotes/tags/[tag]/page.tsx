'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuoteIcon, Terminal, Loader2, ArrowLeft } from "lucide-react";
import { QuotePageEntry, searchQuotesByTag } from '@/lib/api'; // Assuming searchQuotesByTag exists or will be created
import { useAuth } from '@/lib/auth';

export default function TaggedQuotesPage() {
  const params = useParams();
  const router = useRouter();
  const { token: authToken, isLoading: authIsLoading } = useAuth();

  const tag = params.tag as string;

  const [quotes, setQuotes] = useState<QuotePageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1); // Example: for pagination if API supports it
  const [totalPages, setTotalPages] = useState(1); // Example for pagination

  const fetchTaggedQuotes = useCallback(async () => {
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
      const result = await searchQuotesByTag(tag, page, 10, authToken);
      if (result.quotes) {
        setQuotes(result.quotes);
      }
      if (result.totalPages) {
        setTotalPages(result.totalPages);
      }
      if (!result.quotes || result.quotes.length === 0) {
        // setError(`No quotes found for tag "${tag}".`); // This will show the error component, we want the "No Quotes Found" one
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
  }, [tag, authToken, authIsLoading, page]);

  useEffect(() => {
    fetchTaggedQuotes();
  }, [fetchTaggedQuotes]);

  if (isLoading || (authIsLoading && !error)) {
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
          <Card key={quote.id} className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg break-words">
                <Link href={`/quotes/${quote.id}`} className="hover:text-primary transition-colors">
                  &ldquo;{quote.text.length > 100 ? `${quote.text.substring(0, 97)}...` : quote.text}&rdquo;
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {quote.authorName ? (
                  <Link href={`/authors/${quote.authorId}`} className="hover:underline">
                    {quote.authorName}
                  </Link>
                ) : (
                  'Unknown Author'
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {quote.tags.map((t) => (
                  <Link key={t} href={`/quotes/tags/${t.toLowerCase()}`}>
                    <Badge variant="outline" className="hover:bg-accent transition-colors">{t}</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Basic Pagination (Example) */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              onClick={() => setPage(p)}
              disabled={isLoading}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}