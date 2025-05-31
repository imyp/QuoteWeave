'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, TagsIcon, UserCircle2, Loader2 } from "lucide-react";
import { type QuotePageEntry, favoriteQuote, unfavoriteQuote } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import AddToCollectionView from "@/components/quotes/add-to-collection-view";

// Local interface extending the API type to include client-side animation state
interface QuoteCardState extends QuotePageEntry {
  _animateHeart?: boolean;
}

export interface QuoteCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  onOpenModal: (quote: QuotePageEntry) => void;
}

export default function QuoteCard({ quote: initialQuote, onOpenModal, onQuoteUpdate }: QuoteCardProps) {
  const { token, isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const [quote, setQuote] = useState<QuoteCardState>(initialQuote);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    setQuote(prevQuote => {
      if (prevQuote.id === initialQuote.id) {
        return { ...initialQuote, _animateHeart: prevQuote._animateHeart };
      }
      return initialQuote;
    });
  }, [initialQuote]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authIsLoading) return;

    if (!isAuthenticated || !token) {
      toast.info("Please log in to favorite quotes.");
      return;
    }

    setIsFavoriting(true);
    setAnimateHeart(true);

    const originalQuoteState = { ...quote };
    const newFavoriteStatus = !quote.isFavorited;
    const newFavoriteCount = newFavoriteStatus
      ? (quote.favoriteCount || 0) + 1
      : Math.max(0, (quote.favoriteCount || 0) - 1);

    const optimisticallyUpdatedQuote = {
      ...quote,
      isFavorited: newFavoriteStatus,
      favoriteCount: newFavoriteCount,
    };
    setQuote(optimisticallyUpdatedQuote);
    onQuoteUpdate(optimisticallyUpdatedQuote);

    try {
      if (newFavoriteStatus) {
        await favoriteQuote(quote.id, token);
        toast.success("Quote favorited!");
      } else {
        await unfavoriteQuote(quote.id, token);
        toast.success("Quote unfavorited!");
      }
    } catch {
      setQuote(originalQuoteState);
      onQuoteUpdate(originalQuoteState);
    } finally {
      setIsFavoriting(false);
      setTimeout(() => setAnimateHeart(false), 400);
    }
  };

  const authorDisplayName = quote.authorName || 'Unknown Author';
  const authorLinkPath = quote.authorId ? `/authors/${quote.authorId}` : '#';

  const maxVisibleTags = 2;

  return (
    <Card
      onClick={() => onOpenModal(quote)}
      className="bg-card/70 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 ease-in-out cursor-pointer group flex flex-col h-full border border-transparent hover:border-primary/30"
    >
      <CardHeader className="pb-3">
        <Link href={authorLinkPath} onClick={(e) => e.stopPropagation()} className="group/author inline-flex items-center w-fit">
          <UserCircle2 className="h-5 w-5 mr-2 text-muted-foreground group-hover/author:text-primary transition-colors" />
          <CardDescription className="text-sm font-medium text-muted-foreground group-hover/author:text-primary transition-colors">
            {authorDisplayName}
          </CardDescription>
        </Link>
      </CardHeader>
      <CardContent className="flex-grow pb-3">
        <blockquote className="text-lg italic text-foreground group-hover:text-primary transition-colors line-clamp-5">
          &ldquo;{quote.text}&rdquo;
        </blockquote>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-3 border-t border-border/50 mt-auto flex justify-between items-center">
        <div className="flex items-center gap-1.5 flex-shrink min-w-0">
          <TagsIcon className="h-3.5 w-3.5 flex-shrink-0" />
          {quote.tags && quote.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {quote.tags.slice(0, maxVisibleTags).map((tag: string) => (
                <Link key={tag} href={`/quotes/tags/${encodeURIComponent(tag)}`} onClick={(e) => e.stopPropagation()} className="hover:no-underline">
                  <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20 whitespace-nowrap hover:ring-1 hover:ring-primary/50">
                    {tag}
                  </Badge>
                </Link>
              ))}
              {quote.tags.length > maxVisibleTags && (
                <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal whitespace-nowrap">+{quote.tags.length - maxVisibleTags}</Badge>
              )}
            </div>
          ) : (
            <span className="text-xxs">No tags</span>
          )}
        </div>
        <div className="flex items-center flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
            onClick={handleFavoriteToggle}
            disabled={isFavoriting || authIsLoading || !isAuthenticated}
          >
            {isFavoriting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Heart className={`h-4 w-4 ${quote.isFavorited ? 'fill-current' : 'group-hover/fav:fill-red-500/30'} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />}
            <span className="sr-only">Favorite</span>
          </Button>
          <span className="text-xs min-w-[20px] text-right tabular-nums ml-1">{quote.favoriteCount || 0}</span>
        </div>
      </CardFooter>
      {isAuthenticated && token && quote.id && (
          <div className="px-6 pb-4 pt-2 border-t border-border/50">
              <AddToCollectionView
                  quote={quote}
                  userId={user?.id ?? null}
                  authToken={token}
                  onCollectionUpdate={() => {
                      onQuoteUpdate(quote);
                  }}
              />
          </div>
      )}
    </Card>
  );
}