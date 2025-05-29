'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  QuotePageEntry,
  BackendQuote,
  BackendTag,
  UserProfileResponse,
  favoriteQuote,
  unfavoriteQuote,
  deleteQuote as apiDeleteQuote,
  getMyQuotes,
  getCurrentUserProfile
} from "@/lib/api";
import { BookOpenText, ArrowLeft, Edit2Icon, Trash2Icon, Heart, Loader2, TagsIcon, LogIn, AlertTriangle, PlusCircle } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import QuoteDetailModal from "@/components/quote-detail-modal";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

interface UserQuoteCardProps {
  quote: QuotePageEntry;
  onQuoteUpdate: (updatedQuote: QuotePageEntry) => void;
  onOpenModal: () => void;
  onEdit: (quoteId: number) => void;
  onDelete: (quoteId: number) => void;
  isDeleting: boolean;
  authToken: string | null;
}

function UserQuoteCard(
  { quote, onOpenModal, onEdit, onDelete, onQuoteUpdate, isDeleting, authToken }:
    UserQuoteCardProps
) {
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authToken) {
      console.error("Auth token not available for favoriting.");
      return;
    }
    setIsFavoriting(true);
    setAnimateHeart(true);
    setTimeout(() => setAnimateHeart(false), 600);
    try {
      const apiCall = quote.isFavorited ? unfavoriteQuote : favoriteQuote;
      await apiCall(quote.id, authToken);

      const updatedFavoriteStatus = !quote.isFavorited;
      const updatedFavoriteCount = updatedFavoriteStatus
        ? (quote.favoriteCount || 0) + 1
        : Math.max(0, (quote.favoriteCount || 0) - 1);

      onQuoteUpdate({
        ...quote,
        isFavorited: updatedFavoriteStatus,
        favoriteCount: updatedFavoriteCount,
      });
    } catch (error) {
      console.error("Error in handleFavoriteToggle:", error);
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
          <p className="text-sm text-muted-foreground mb-2">- {quote.authorName || "Unknown Author"}</p>
        </div>
      </DialogTrigger>
      <CardFooter className="p-3 border-t border-border/30 mt-auto flex justify-between items-center">
        <div className="flex items-center gap-1.5 flex-shrink min-w-0">
          <TagsIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          {quote.tags && quote.tags.length > 0 ? (
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
            <span className="text-xs italic text-muted-foreground">No tags</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 group/fav ${quote.isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
            onClick={handleFavoriteToggle}
            disabled={isFavoriting || isDeleting}
          >
            <Heart className={`h-4 w-4 ${quote.isFavorited ? 'fill-current' : 'group-hover/fav:fill-red-500/30'} ${animateHeart ? 'animate-pulse-heart' : ''} transition-all`} />
            <span className="sr-only">Favorite</span>
          </Button>
          <span className="text-xs min-w-[10px] text-right tabular-nums mr-1 text-muted-foreground">{quote.favoriteCount || 0}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(quote.id)} disabled={isFavoriting || isDeleting}>
            <Edit2Icon className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" disabled={isFavoriting || isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete this quote. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(quote.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/80">
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function UserProfileQuotesPage() {
  const router = useRouter();
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [userQuotes, setUserQuotes] = useState<QuotePageEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDelete, setIsLoadingDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuoteModal, setSelectedQuoteModal] = useState<QuotePageEntry | null>(null);

  useEffect(() => {
    if (authIsLoading) {
        setIsLoading(true);
        return;
    }

    if (!isAuthenticated) {
      setError("Please log in to view your quotes.");
      setIsLoading(false);
      return;
    }

    if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
    }

    const fetchProfileAndQuotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profileData = await getCurrentUserProfile(authToken);
        setUserProfile(profileData);

        const quotesResponse = await getMyQuotes(authToken);
        if (quotesResponse && quotesResponse.quotes) {
          const mappedQuotes = quotesResponse.quotes.map((bq: BackendQuote): QuotePageEntry => ({
            id: bq.id,
            text: bq.text,
            authorName: profileData.username,
            authorId: bq.author_id,
            tags: bq.tags ? bq.tags.map((t: BackendTag) => t.name) : [],
            isFavorited: bq.isFavorited || false,
            favoriteCount: bq.favoriteCount || 0,
          }));
          setUserQuotes(mappedQuotes);
        } else {
          setUserQuotes([]);
        }
      } catch (err) {
        console.error("Failed to fetch user profile or quotes:", err);
        setError((err instanceof Error ? err.message : String(err)) || "Failed to load data.");
        setUserQuotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndQuotes();
  }, [authToken, isAuthenticated, authIsLoading]);

  const handleQuoteUpdateOnPage = (updatedQuote: QuotePageEntry) => {
    setUserQuotes(prevQuotes =>
      prevQuotes ? prevQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q) : []
    );
    if (selectedQuoteModal && selectedQuoteModal.id === updatedQuote.id) {
      setSelectedQuoteModal(updatedQuote);
    }
  };

  const handleOpenModal = (quote: QuotePageEntry) => {
    setSelectedQuoteModal(quote);
  };

  const handleDeleteQuote = async (quoteId: number) => {
    if (!authToken) {
        setError("Cannot delete quote: Authentication token not found.");
        return;
    }
    setIsLoadingDelete(quoteId);
    setError(null);
    try {
      await apiDeleteQuote(quoteId, authToken);
      setUserQuotes(prevQuotes => prevQuotes ? prevQuotes.filter(q => q.id !== quoteId) : []);
    } catch (err) {
      console.error("Failed to delete quote:", err);
      setError((err instanceof Error ? err.message : String(err)) || "Failed to delete the quote.");
    } finally {
      setIsLoadingDelete(null);
    }
  };

  if (isLoading && !userProfile && !userQuotes) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your quotes...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Alert variant="default" className="max-w-md">
          <LogIn className="h-5 w-5" />
          <AlertTitle>Access Your Quotes</AlertTitle>
          <AlertDescription>
            Please log in to view and manage your quotes.
            <Button asChild className="mt-4 w-full">
              <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Proceed to Login</Link>
            </Button>
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/profile')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </div>
    );
  }

  if (error && (!userQuotes || userQuotes.length === 0) && !isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/profile')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={!!selectedQuoteModal} onOpenChange={(isOpen) => { if (!isOpen) setSelectedQuoteModal(null); }}>
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
              <BookOpenText className="mr-3 h-6 w-6" /> My Quotes ({userQuotes?.length || 0})
            </CardTitle>
            <CardDescription>Browse and manage all the quotes you have created.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && userQuotes === null && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading quotes...</p>
              </div>
            )}
            {!isLoading && userQuotes && userQuotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userQuotes.map((quote: QuotePageEntry) => (
                  <UserQuoteCard
                    key={quote.id}
                    quote={quote}
                    onOpenModal={() => handleOpenModal(quote)}
                    onQuoteUpdate={handleQuoteUpdateOnPage}
                    onEdit={(id) => router.push(`/quotes/${id}/edit`)}
                    onDelete={() => handleDeleteQuote(quote.id)}
                    isDeleting={isLoadingDelete === quote.id}
                    authToken={authToken}
                  />
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="text-center py-10">
                  <TagsIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">You haven&apos;t added any quotes yet.</p>
                  <Button asChild className="mt-4">
                    <Link href="/quotes/new"><PlusCircle className="mr-2 h-4 w-4" />Add Your First Quote</Link>
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {selectedQuoteModal && (
          <QuoteDetailModal
            quote={{
              id: selectedQuoteModal.id,
              text: selectedQuoteModal.text,
              authorName: selectedQuoteModal.authorName,
              authorId: selectedQuoteModal.authorId,
              tags: selectedQuoteModal.tags,
              isFavorited: selectedQuoteModal.isFavorited,
              favoriteCount: selectedQuoteModal.favoriteCount,
            } as QuotePageEntry}
            onQuoteUpdate={(updatedApiQuote: QuotePageEntry) => {
              const quoteForUpdate: QuotePageEntry = {
                id: updatedApiQuote.id !== undefined ? updatedApiQuote.id : selectedQuoteModal.id,
                text: updatedApiQuote.text !== undefined ? updatedApiQuote.text : selectedQuoteModal.text,
                authorName: updatedApiQuote.authorName !== undefined ? updatedApiQuote.authorName : selectedQuoteModal.authorName,
                authorId: updatedApiQuote.authorId !== undefined ? updatedApiQuote.authorId : selectedQuoteModal.authorId,
                tags: updatedApiQuote.tags !== undefined ? updatedApiQuote.tags : selectedQuoteModal.tags || [],
                isFavorited: updatedApiQuote.isFavorited !== undefined ? updatedApiQuote.isFavorited : selectedQuoteModal.isFavorited,
                favoriteCount: updatedApiQuote.favoriteCount !== undefined ? updatedApiQuote.favoriteCount : selectedQuoteModal.favoriteCount,
              };
              handleQuoteUpdateOnPage(quoteForUpdate);
            }}
          />
        )}
      </div>
    </Dialog>
  );
}