'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Edit3, Settings, Bookmark, BookOpen, LogIn, AlertTriangle, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getCurrentUserProfile,
  getMyQuotes,
  getMyCollections,
  UserProfileResponse,
  BackendQuote,
  CollectionEntry
} from "@/lib/api";

interface DisplayQuote {
  id: number;
  text: string;
}

export default function UserProfilePage() {
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [userQuotes, setUserQuotes] = useState<DisplayQuote[]>([]);
  const [userCollections, setUserCollections] = useState<CollectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setError("Please log in to view your profile.");
      setIsLoading(false);
      setUserProfile(null);
      setUserQuotes([]);
      setUserCollections([]);
      return;
    }

    if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        setUserProfile(null);
        setUserQuotes([]);
        setUserCollections([]);
        return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profileData = await getCurrentUserProfile(authToken);
        setUserProfile(profileData);

        try {
          const quotesResponse = await getMyQuotes(authToken);
          if (quotesResponse && quotesResponse.quotes) {
            const displayQuotes = quotesResponse.quotes.map((bq: BackendQuote): DisplayQuote => ({
              id: bq.id,
              text: bq.text,
            }));
            setUserQuotes(displayQuotes);
          } else {
            setUserQuotes([]);
          }
        } catch (quotesError) {
          console.warn("Failed to fetch user quotes:", quotesError);
          setUserQuotes([]);
        }

        try {
          const collectionsData = await getMyCollections(authToken);
          setUserCollections(collectionsData || []);
        } catch (collectionsError) {
          console.warn("Failed to fetch user collections:", collectionsError);
          setUserCollections([]);
        }

      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError((err instanceof Error ? err.message : String(err)) || "An unknown error occurred.");
        setUserProfile(null);
        setUserQuotes([]);
        setUserCollections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authToken, isAuthenticated, authIsLoading]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error Loading Profile</AlertTitle>
          <AlertDescription>
            {error}
            {(!isAuthenticated && !authIsLoading) && (
              <Button asChild className="mt-4 w-full">
                <Link href="/login"> <LogIn className="mr-2 h-4 w-4"/>Please Log In</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!authIsLoading && !isAuthenticated) {
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <Alert variant="default" className="max-w-lg">
          <LogIn className="h-5 w-5" />
          <AlertTitle>Profile Access</AlertTitle>
          <AlertDescription>
            Please log in to view your profile and manage your quotes and collections.
            <Button asChild className="mt-4 w-full">
              <Link href="/login"> <LogIn className="mr-2 h-4 w-4"/>Proceed to Login</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userProfile) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl min-h-[calc(100vh-4rem)] flex items-center justify-center">
            <Alert variant="default">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Profile Not Available</AlertTitle>
                <AlertDescription>
                    Your profile data could not be loaded. Please try logging in again or contact support if the issue persists.
                     <Button asChild className="mt-4 w-full">
                        <Link href="/login"> <LogIn className="mr-2 h-4 w-4"/>Login</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl min-h-[calc(100vh-4rem)]">
      <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="p-6 bg-muted/30 border-b border-border">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24 border-2 border-primary/50 shadow-md">
              <AvatarFallback className="text-3xl">
                {userProfile.username?.charAt(0).toUpperCase()}
                {userProfile.username?.includes(' ') ? userProfile.username?.split(' ')?.[1]?.charAt(0).toUpperCase() : userProfile.username?.charAt(1)?.toUpperCase() || ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-primary">{userProfile.username}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-base">{userProfile.email}</CardDescription>
              <Link href="/profile/edit" passHref>
                <Button variant="outline" size="sm" className="mt-4 text-xs">
                  <Edit3 className="mr-2 h-3 w-3" /> Edit Profile
                </Button>
              </Link>
            </div>
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          <div>
            <div className="flex justify-between items-center">
              <Link href="/profile/quotes" passHref>
                <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center cursor-pointer hover:underline">
                  <Bookmark className="mr-3 h-6 w-6" /> My Quotes ({userQuotes.length})
                </h2>
              </Link>
              <Link href="/quotes/new" passHref>
                  <Button variant="outline" size="sm" className="text-xs">
                      <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Quote
                  </Button>
              </Link>
            </div>
            {userQuotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userQuotes.slice(0, 4).map((quote) => (
                  <Link key={quote.id} href={`/quotes/${quote.id}`} passHref>
                    <Card className="bg-background/70 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col group hover:border-primary/30 border border-transparent">
                      <CardContent className="p-4 flex-grow">
                        <blockquote className="text-sm italic text-foreground/90 group-hover:text-primary transition-colors truncate-3-lines">
                          &ldquo;{quote.text}&rdquo;
                        </blockquote>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No quotes added yet. <Link href="/quotes/new" className="text-primary hover:underline">Add your first quote!</Link></p>
            )}
            {userQuotes.length > 0 && (
                <div className="mt-4 text-right">
                <Link href="/profile/quotes" passHref>
                    <Button variant="link" className="text-primary text-sm">View All My Quotes</Button>
                </Link>
                </div>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex justify-between items-center">
              <Link href="/profile/collections" passHref>
                <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center cursor-pointer hover:underline">
                  <BookOpen className="mr-3 h-6 w-6" /> My Collections ({userCollections.length})
                </h2>
              </Link>
              <Link href="/collections/new" passHref>
                  <Button variant="outline" size="sm" className="text-xs">
                      <PlusCircle className="mr-2 h-3.5 w-3.5" /> Create Collection
                  </Button>
              </Link>
            </div>
            {userCollections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userCollections.slice(0, 4).map((collection) => (
                  <Link key={collection.id} href={`/collections/${collection.id}`} passHref>
                    <Card className="bg-background/70 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col group hover:border-primary/30 border border-transparent">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors truncate">{collection.name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                          {collection.isPublic ? 'Public' : 'Private'} • {collection.quoteCount || 0} quotes
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No collections created yet. <Link href="/collections/new" className="text-primary hover:underline">Create a new collection!</Link></p>
            )}
            {userCollections.length > 0 && (
                <div className="mt-4 text-right">
                <Link href="/profile/collections" passHref>
                    <Button variant="link" className="text-primary text-sm">View All My Collections</Button>
                </Link>
                </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-6 bg-muted/30 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
                QuoteWeave &copy; {new Date().getFullYear()} - Weave Your Wisdom
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}