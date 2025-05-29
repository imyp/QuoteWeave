'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Edit3, Settings, Bookmark, BookOpen } from "lucide-react";
import Link from "next/link";
import { mockUser } from "@/lib/user-utils"; // Import shared mock user

// Mock data for user's content (simplified)
const mockUserQuotes = [
  { id: "q1", text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { id: "q2", text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
];

const mockUserCollections = [
  { id: "c1", name: "Stoic Wisdom", quoteCount: 15 },
  { id: "c2", name: "Entrepreneurial Insights", quoteCount: 28 },
];

export default function UserProfilePage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl min-h-[calc(100vh-4rem)]">
      <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="p-6 bg-muted/30 border-b border-border">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24 border-2 border-primary/50 shadow-md">
              <AvatarImage src={mockUser.avatarUrl} alt={mockUser.username} />
              <AvatarFallback className="text-3xl">
                {mockUser.username?.charAt(0).toUpperCase()}
                {mockUser.username?.split(' ')?.[1]?.charAt(0).toUpperCase() || mockUser.username?.charAt(1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-primary">{mockUser.username}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-base">{mockUser.email}</CardDescription>
              <p className="text-sm text-muted-foreground mt-2">{mockUser.joinedDate}</p>
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
          {mockUser.bio && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-sm text-foreground/90 leading-relaxed">{mockUser.bio}</p>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          <div>
            <Link href="/profile/quotes" passHref>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center cursor-pointer hover:underline">
                <Bookmark className="mr-3 h-6 w-6" /> My Quotes
              </h2>
            </Link>
            {mockUserQuotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockUserQuotes.map((quote) => (
                  <Link key={quote.id} href={`/quotes/${quote.id}`} passHref>
                    <Card className="bg-background/70 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col group hover:border-primary/30 border border-transparent">
                      <CardContent className="p-4 flex-grow">
                        <blockquote className="text-sm italic text-foreground/90 group-hover:text-primary transition-colors">&ldquo;{quote.text}&rdquo;</blockquote>
                      </CardContent>
                      <CardFooter className="p-3 pt-2 text-xs text-muted-foreground border-t border-border/50">
                        - {quote.author}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No quotes added yet.</p>
            )}
            <div className="mt-4 text-right">
              <Link href="/profile/quotes" passHref>
                <Button variant="link" className="text-primary text-sm">View All Quotes</Button>
              </Link>
            </div>
          </div>

          <Separator />

          <div>
            <Link href="/profile/collections" passHref>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center cursor-pointer hover:underline">
                <BookOpen className="mr-3 h-6 w-6" /> My Collections
              </h2>
            </Link>
            {mockUserCollections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockUserCollections.map((collection) => (
                  <Link key={collection.id} href={`/collections/${collection.id}`} passHref>
                    <Card className="bg-background/70 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col group hover:border-primary/30 border border-transparent">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base font-semibold text-foreground/90 group-hover:text-primary transition-colors">{collection.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 flex-grow">
                        <p className="text-xs text-muted-foreground">{collection.quoteCount} quotes</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No collections created yet.</p>
            )}
             <div className="mt-4 text-right">
              <Link href="/profile/collections" passHref>
                <Button variant="link" className="text-primary text-sm">View All Collections</Button>
              </Link>
            </div>
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