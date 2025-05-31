'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type QuotePageEntry, favoriteQuote, unfavoriteQuote } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { QuoteIcon, UserCircle, TagsIcon, Edit2Icon, ExternalLink, XIcon, Heart, Loader2 } from "lucide-react";

// Local interface extending the API type to include client-side animation state
interface QuoteModalState extends QuotePageEntry {
  _animateHeart?: boolean;
}

interface QuoteDetailModalProps {
  quote: QuotePageEntry;
  onQuoteUpdate?: (updatedQuote: QuotePageEntry) => void;
}

export default function QuoteDetailModal({ quote: initialQuote, onQuoteUpdate }: QuoteDetailModalProps) {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [quote, setQuote] = useState<QuoteModalState>(initialQuote);
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


  if (!quote) return null;

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authIsLoading) return;

    if (!isAuthenticated || !token) {
      console.warn("User not authenticated. Cannot favorite.");
      return;
    }

    setIsFavoriting(true);
    setAnimateHeart(true);

    // Optimistic update
    const originalQuote = { ...quote };
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
    if (onQuoteUpdate) {
        onQuoteUpdate(optimisticallyUpdatedQuote);
    }

    try {
      if (newFavoriteStatus) {
        await favoriteQuote(quote.id, token);
        toast.success("Quote favorited!");
      } else {
        await unfavoriteQuote(quote.id, token);
        toast.success("Quote unfavorited!");
      }
    } catch (error) {
      console.error("Failed to update favorite status:", error);
      setQuote(originalQuote);
      if (onQuoteUpdate) {
        onQuoteUpdate(originalQuote);
      }
    } finally {
      setIsFavoriting(false);
      setTimeout(() => setAnimateHeart(false), 400);
    }
  };

  const authorDisplayName = quote.authorName || 'Unknown Author';
  const authorLink = quote.authorId ? `/authors/${quote.authorId}` : '#';

  return (
    <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-lg dark:bg-background/90">
      <DialogHeader className="text-center pt-6">
        <QuoteIcon className="mx-auto h-10 w-10 text-primary mb-3" />
        <DialogTitle className="text-2xl font-bold text-foreground">Quote Details</DialogTitle>
      </DialogHeader>

      <div className="px-6 py-6 text-center">
        <blockquote className="text-lg lg:text-xl text-foreground leading-relaxed mb-6">
          <p className="whitespace-pre-line">&ldquo;{quote.text}&rdquo;</p>
        </blockquote>
        <div className="flex flex-col items-center space-y-2">
            <Link href={authorLink} passHref>
              <span className="group inline-flex items-center justify-center cursor-pointer">
                <UserCircle className="h-5 w-5 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <DialogDescription className="text-md text-muted-foreground group-hover:text-primary transition-colors">
                  {authorDisplayName}
                </DialogDescription>
              </span>
            </Link>
            <div className="flex items-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
                    onClick={handleFavoriteToggle}
                    disabled={isFavoriting || authIsLoading || !isAuthenticated}
                >
                    {isFavoriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${quote.isFavorited ? 'fill-current' : 'group-hover/fav:fill-red-500/30'} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />}
                    <span className="sr-only">Favorite</span>
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums ml-1.5">{quote.favoriteCount || 0} favorites</span>
            </div>
        </div>
      </div>

      {quote.tags && quote.tags.length > 0 && (
        <div className="px-6 pb-6 flex flex-col items-center gap-3 border-t border-border/50 pt-6 mt-4">
          <div className="flex items-center text-muted-foreground">
            <TagsIcon className="h-4 w-4 mr-2" />
            <h3 className="text-xs font-medium uppercase tracking-wider">Tags</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {quote.tags.map(tag => (
              <Link href={`/quotes/tags/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`} key={tag} passHref>
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5 hover:bg-primary/20 transition-colors cursor-pointer">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="sm:justify-between px-6 pb-6 pt-4 border-t border-border/50 mt-2">
        <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/quotes/${quote.id}/edit`)}
            className="text-xs"
        >
            <Edit2Icon className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/quotes/${quote.id}`)}
            className="text-xs"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Full Page
          </Button>
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="text-xs">
                <XIcon className="mr-1.5 h-3.5 w-3.5" /> Close
            </Button>
          </DialogClose>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}