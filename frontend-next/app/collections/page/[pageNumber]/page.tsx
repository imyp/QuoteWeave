'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { searchCollections, CollectionEntry } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LayersIcon, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const ITEMS_PER_PAGE = 9;


function CollectionEntryCard({ collection }: { collection: CollectionEntry }) {
  return (
    <Link href={`/collections/${collection.id}`} passHref>
      <Card className="bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in-out flex flex-col h-full cursor-pointer group border border-transparent hover:border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors flex items-center">
            <LayersIcon className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            {collection.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow pb-3">
          <CardDescription className="line-clamp-3 text-sm">
            {collection.description || "No description available."}
          </CardDescription>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-3 border-t border-border/50 mt-auto flex justify-between">
          <span>{collection.quoteCount || 0} Quotes</span>
          <span>{collection.isPublic ? "Public" : "Private"}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default function CollectionsDisplayPage() {
  const router = useRouter();
  const paramsHook = useParams();
  const { token: authToken, isLoading: authIsLoading } = useAuth();

  const pageNumberString = paramsHook.pageNumber as string;
  const pageNumber = parseInt(pageNumberString || "1", 10);

  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authIsLoading) {
        setIsLoading(true);
        return;
    }

    if (isNaN(pageNumber) || pageNumber < 1) {
      router.replace('/collections/page/1');
      return;
    }
    setIsLoading(true);
    setError(null);

    const skip = (pageNumber - 1) * ITEMS_PER_PAGE;
    searchCollections("", ITEMS_PER_PAGE, skip, authToken)
      .then(data => {
        setCollections(data || []);
        if (data && data.length < ITEMS_PER_PAGE) {
            setTotalPages(pageNumber);
        } else if (data && data.length === ITEMS_PER_PAGE) {
            setTotalPages(pageNumber + 1);
        }

        if (data && data.length === 0 && pageNumber > 1) {
          router.replace('/collections/page/1');
          return;
        }
      })
      .catch(err => {
        console.error("Failed to fetch collections:", err);
        setError("Failed to load collections. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pageNumber, router, authToken, authIsLoading]);

  const pageIndices = useMemo(() => {
    if (totalPages <= 0) return [];
    const pages = new Set<number>();
    pages.add(1);
    if (totalPages > 1) pages.add(totalPages);
    const surrounding = 1;

    for (let i = Math.max(2, pageNumber - surrounding); i <= Math.min(totalPages - 1, pageNumber + surrounding); i++) {
      pages.add(i);
    }
    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const result: (number | string)[] = [];
    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      if (i === 0) {
        result.push(page);
      } else {
        const prev = sortedPages[i - 1];
        if (page - prev === 1) {
          result.push(page);
        } else {
          result.push("...");
          result.push(page);
        }
      }
    }
    return result;
  }, [pageNumber, totalPages]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading collections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Collections</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (collections.length === 0 && pageNumber === 1) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">No Collections Found</h1>
        <p className="text-muted-foreground mb-8">It looks like there are no collections to display at the moment.</p>
        <Link href="/" className="text-primary hover:underline">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Collections</h1>
        <p className="mt-2 text-lg text-muted-foreground">Browse through curated collections of quotes.</p>
      </header>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow">
          {collections.map(collection => (
            <CollectionEntryCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        pageNumber > 1 && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-lg">No more collections found for page {pageNumber}.</p>
            <Button onClick={() => router.push('/collections/page/1')} variant="link">Back to first page</Button>
          </div>
        )
      )}

      {totalPages > 1 && collections.length > 0 && (
        <Pagination className="mt-12 pt-4 border-t border-border">
          <PaginationContent>
            {pageNumber > 1 && (
              <PaginationItem>
                <PaginationPrevious href={`/collections/page/${pageNumber - 1}`} />
              </PaginationItem>
            )}
            {pageIndices.map((item, index) => (
              <PaginationItem key={index}>
                {typeof item === 'number' ? (
                  <PaginationLink href={`/collections/page/${item}`} isActive={item === pageNumber}>
                    {item}
                  </PaginationLink>
                ) : (
                  item
                )}
              </PaginationItem>
            ))}
            {pageNumber < totalPages && (
              <PaginationItem>
                <PaginationNext href={`/collections/page/${pageNumber + 1}`} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}