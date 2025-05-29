'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuotePageEntry, getQuotePage, PaginatedQuotesResponse, favoriteQuote, unfavoriteQuote } from "@/lib/quote-utils"; // Added favorite/unfavorite
import { BookOpenText, Terminal, ArrowLeft, Edit2Icon, Trash2Icon, EyeIcon, Heart, Loader2, TagsIcon } from "lucide-react"; // Added Heart, Loader2, TagsIcon
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import QuoteDetailModal from "@/components/QuoteDetailModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Mock user data - in a real app, this would come from auth context or API
const mockUser = {
  username: "QuoteFan123",
};

// Mock data for user's content (simplified from profile page for this example)
// const mockUserQuotes = [ ... ]; // This will be replaced by fetched data

interface UserQuoteCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  onOpenModal: () => void;
  onEdit: (quoteId: string) => void;
  onDelete: (quoteId: string) => void;
}

function UserQuoteCard(
  { quote, onOpenModal, onEdit, onDelete, onQuoteUpdate }:
  UserQuoteCardProps
) {
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Keep this if the button is inside a larger clickable area
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
      console.error("Failed to update favorite status on user profile card", error);
    } finally {
      setIsFavoriting(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-lg flex flex-col h-full relative group">
      <DialogTrigger asChild>
        <div onClick={onOpenModal} className="cursor-pointer flex-grow p-4 pb-0">
          <blockquote className="text-base italic text-foreground/90 mb-2 line-clamp-3 group-hover:text-primary transition-colors">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <p className="text-sm text-muted-foreground mb-2">- {quote.authorName}</p>
        </div>
      </DialogTrigger>
      <CardFooter className="p-3 border-t border-border/30 mt-auto flex justify-between items-center">
        <div className="flex items-center gap-1.5 flex-shrink min-w-0">
            <TagsIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {quote.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 overflow-hidden">
                {quote.tags.slice(0, 1).map(tag => (
                    <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal group-hover:bg-primary/20 truncate">
                        {tag}
                    </Badge>
                ))}
                {quote.tags.length > 1 && (
                    <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">+{quote.tags.length - 1}</Badge>
                )}
                </div>
            ) : (
                <span className="text-xxs italic">No tags</span>
            )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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
            <span className="text-xs min-w-[10px] text-right tabular-nums mr-1">{quote.favoriteCount || 0}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(quote.id)}>
                <Edit2Icon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(quote.id)}>
                <Trash2Icon className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function UserProfileQuotesPage() {
  const router = useRouter();
  const [userQuotesData, setUserQuotesData] = useState<PaginatedQuotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotePageEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // For mock purposes, we'll fetch all quotes.
  // In a real app, getQuotePage might accept a userId or have a dedicated function like getUserQuotes.
  const MOCK_USER_ID = "user123"; // Placeholder
  const currentPage = 1; // Assuming first page for simplicity, add pagination if needed
  const ITEMS_PER_PAGE = 10; // Or however many you want to show

  const handleQuoteUpdateOnPage = (updatedQuote: QuotePageEntry) => {
    setUserQuotesData(prevData => {
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
    // TODO: Update getQuotePage to filter by MOCK_USER_ID if backend supports it.
    // For now, it fetches all quotes, which isn't truly "My Quotes" unless the user wrote them all.
    getQuotePage(currentPage, ITEMS_PER_PAGE /*, { userId: MOCK_USER_ID } */)
      .then(data => {
        setUserQuotesData(data);
      })
      .catch(err => {
        console.error("Failed to fetch user quotes:", err);
        setError("Failed to load your quotes. Please try again.");
      })
      .finally(() => setIsLoading(false));
  }, [currentPage]); // Dependency on currentPage if pagination is added

  const handleDeleteQuote = async (quoteId: string) => {
    console.log("Attempting to delete quote:", quoteId);
    // TODO: Implement actual API call for deletion
    // optimistic update or refetch:
    setUserQuotesData(prevData => {
        if (!prevData) return null;
        return {
            ...prevData,
            quotes: prevData.quotes.filter(q => q.id !== quoteId),
            totalQuotes: prevData.totalQuotes -1
        };
    });
    setShowDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your quotes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Quotes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/profile')} className="mt-6">Back to Profile</Button>
      </div>
    );
  }

  return (
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuote(null); }}>
      <div className="container mx-auto py-8 px-4 md:px-6 min-h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" size="sm" onClick={() => router.push('/profile')} className="text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <BookOpenText className="mr-3 h-6 w-6"/> My Quotes
            </CardTitle>
            <CardDescription>Browse and manage all the quotes you have created.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userQuotesData && userQuotesData.quotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userQuotesData.quotes.map((quote: QuotePageEntry) => (
                  <UserQuoteCard
                    key={quote.id}
                    quote={quote}
                    onOpenModal={() => handleOpenModal(quote)}
                    onQuoteUpdate={handleQuoteUpdateOnPage}
                    onEdit={() => router.push(`/quotes/${quote.id}/edit`)}
                    onDelete={() => setShowDeleteConfirm(quote.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">You haven&apos;t added any quotes yet.</p>
            )}
          </CardContent>
        </Card>

        {selectedQuote && (
          <QuoteDetailModal
            quote={selectedQuote}
            onQuoteUpdate={handleQuoteUpdateOnPage}
          />
        )}

        {showDeleteConfirm && (
          <Dialog open={!!showDeleteConfirm} onOpenChange={(isOpen) => !isOpen && setShowDeleteConfirm(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                    Are you sure you want to delete this quote? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleDeleteQuote(showDeleteConfirm)}>Delete Quote</Button>
                </DialogFooter>
            </DialogContent>
           </Dialog>
        )}
      </div>
    </Dialog>
  );
}