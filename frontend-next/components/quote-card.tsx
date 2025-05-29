'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogTrigger } from "@/components/ui/dialog";
import { Heart, TagsIcon, UserCircle2, Loader2 } from "lucide-react";
import { type QuotePageEntry, favoriteQuote, unfavoriteQuote } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface QuoteCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  onOpenModal: (quote: QuotePageEntry) => void; // Pass the quote to the modal opener
}

export default function QuoteCard({ quote: initialQuote, onOpenModal, onQuoteUpdate }: QuoteCardProps) {
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [quote, setQuote] = useState<QuotePageEntry>(initialQuote);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    setQuote(prevQuote => {
      const baseState = { ...initialQuote };
      const updatedQuote = !isAuthenticated && baseState.isFavorited === true
        ? { ...baseState, isFavorited: false }
        : baseState;

      // Keep local animation state if quote ID is the same, otherwise reset
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return prevQuote.id === updatedQuote.id ? { ...updatedQuote, _animateHeart: (prevQuote as any)._animateHeart } : updatedQuote;
    });
  }, [initialQuote, isAuthenticated]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening if card itself is a trigger
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
      // Generic error toast is handled by fetchApi
    } finally {
      setIsFavoriting(false);
      setTimeout(() => setAnimateHeart(false), 400);
    }
  };

  const authorDisplayName = quote.authorName || 'Unknown Author';
  const authorLinkPath = quote.authorId ? `/authors/${quote.authorId}` : '#';

  // Determine how many tags to show initially based on available space or preference
  const maxVisibleTags = 2; // Example: show up to 2 tags, then a "+N" badge

  return (
    <DialogTrigger asChild>
      <Card
        onClick={() => onOpenModal(quote)} // Ensure the quote is passed to the handler
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
          {/* Using line-clamp for potentially long quotes. Adjust value as needed. */}
          <blockquote className="text-lg italic text-foreground group-hover:text-primary transition-colors line-clamp-5">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-3 border-t border-border/50 mt-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5 flex-shrink min-w-0"> {/* Added flex-shrink and min-w-0 for responsiveness */}
            <TagsIcon className="h-3.5 w-3.5 flex-shrink-0" /> {/* flex-shrink-0 for icon */}
            {quote.tags && quote.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 overflow-hidden"> {/* overflow-hidden for tag container */}
                {quote.tags.slice(0, maxVisibleTags).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20 whitespace-nowrap">
                    {tag}
                  </Badge>
                ))}
                {quote.tags.length > maxVisibleTags && (
                  <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal whitespace-nowrap">+{quote.tags.length - maxVisibleTags}</Badge>
                )}
              </div>
            ) : (
              <span className="text-xxs">No tags</span>
            )}
          </div>
          <div className="flex items-center flex-shrink-0"> {/* flex-shrink-0 for favorite button section */}
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
      </Card>
    </DialogTrigger>
  );
}