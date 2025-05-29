'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Loader2, AlertTriangle, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyCollections, CollectionEntry, getCurrentUserProfile } from "@/lib/api";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth"; // Import useAuth

// Mock user data
// const mockUser = {
//   username: "QuoteFan123",
// };

// Mock data for user's collections
// const mockUserCollections = [
//   { id: "c1", name: "Stoic Wisdom", description: "A collection of quotes on stoicism and resilience.", quoteCount: 15, isPublic: true, tags: ["stoicism", "philosophy", "resilience", "virtue"] },
//   { id: "c2", name: "Entrepreneurial Insights for Modern Times", description: "Wisdom for the startup journey, focusing on innovation and market adaptation.", quoteCount: 28, isPublic: false, tags: ["business", "startups", "motivation", "innovation", "strategy"] },
//   { id: "c3", name: "Poetic Musings on Nature and Life", description: "Verses that touch the soul, exploring the beauty of the natural world and human existence.", quoteCount: 8, isPublic: true, tags: ["poetry", "art", "nature", "life", "beauty"] },
// ];

export default function UserCollectionsPage() {
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth(); // Get auth token and user
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('User');

  useEffect(() => {
    if (authIsLoading) {
        setIsLoading(true);
        return;
    }

    if (!isAuthenticated) {
        setError("Please log in to view your collections.");
        setIsLoading(false);
        return;
    }

    if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
    }

    const fetchCollectionsAndProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profile = await getCurrentUserProfile(authToken);
        if (profile && profile.username) {
          setUsername(profile.username);
        }

        const userCollections = await getMyCollections(authToken);
        setCollections(userCollections || []);

      } catch (err) {
        console.error("Failed to fetch collections or profile:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionsAndProfile();
  }, [authToken, isAuthenticated, authIsLoading]);

  if (isLoading && collections.length === 0 && !error) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl min-h-[calc(100vh-4rem)] flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your collections...</p>
        </div>
    );
  }

  if (!isAuthenticated && !authIsLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
            <Alert variant="default">
                <LogIn className="h-5 w-5" />
                <AlertTitle>Access Your Collections</AlertTitle>
                <AlertDescription>
                    {error || "Please log in to view your collections."}
                    <Button asChild className="mt-4 w-full">
                        <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Proceed to Login</Link>
                    </Button>
                </AlertDescription>
            </Alert>
             <Link href="/profile" passHref className="mt-6">
              <Button variant="outline" size="sm" className="text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl min-h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <Link href="/profile" passHref>
          <Button variant="outline" size="sm" className="text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </Link>
      </div>

      <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            My Collections ({username})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading your collections...</p>
            </div>
          )}
          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Collections</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && collections.length > 0 ? (
            <div className="space-y-4">
              {collections.map((collection) => (
                <Link key={collection.id} href={`/collections/${collection.id}`} passHref legacyBehavior>
                  <a className="block">
                    <Card className="bg-background/70 hover:shadow-lg transition-all duration-200 ease-in-out hover:border-primary/50 border-transparent border cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-lg font-semibold text-primary/90 hover:text-primary transition-colors flex-grow pr-2 truncate">{collection.name}</CardTitle>
                            <Badge variant={collection.isPublic ? "outline" : "secondary"} className="text-xs flex-shrink-0">
                                {collection.isPublic ? "Public" : "Private"}
                            </Badge>
                        </div>
                        {collection.description && (
                            <CardDescription className="text-xs text-muted-foreground pt-1 truncate h-8 leading-4">{collection.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-1 pb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center flex-shrink-0">
                                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                                <span>{collection.quoteCount} Quotes</span>
                            </div>
                            {/* Tags for collections not implemented in backend yet */}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (!isLoading && !error && (
            <p className="text-muted-foreground text-center py-4">You haven&apos;t created any collections yet.</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}