'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Tag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock user data
const mockUser = {
  username: "QuoteFan123",
};

// Mock data for user's collections
const mockUserCollections = [
  { id: "c1", name: "Stoic Wisdom", description: "A collection of quotes on stoicism and resilience.", quoteCount: 15, isPublic: true, tags: ["stoicism", "philosophy", "resilience", "virtue"] },
  { id: "c2", name: "Entrepreneurial Insights for Modern Times", description: "Wisdom for the startup journey, focusing on innovation and market adaptation.", quoteCount: 28, isPublic: false, tags: ["business", "startups", "motivation", "innovation", "strategy"] },
  { id: "c3", name: "Poetic Musings on Nature and Life", description: "Verses that touch the soul, exploring the beauty of the natural world and human existence.", quoteCount: 8, isPublic: true, tags: ["poetry", "art", "nature", "life", "beauty"] },
];

export default function UserCollectionsPage() {
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
            My Collections ({mockUser.username})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {mockUserCollections.length > 0 ? (
            <div className="space-y-4">
              {mockUserCollections.map((collection) => (
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
                            {collection.tags && collection.tags.length > 0 && (
                                <div className="flex items-center ml-2 flex-shrink min-w-0">
                                    <Tag className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                    <span className="truncate text-ellipsis overflow-hidden whitespace-nowrap max-w-[150px] sm:max-w-[200px]">{collection.tags.join(", ")}</span>
                                </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">You haven&apos;t created any collections yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}