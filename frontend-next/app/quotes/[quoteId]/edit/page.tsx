'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { getQuoteById, updateQuote, UpdateQuotePayload, QuotePageEntry, deleteQuote } from "@/lib/quote-utils";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Loader2, Save, Terminal, Edit, Trash2Icon } from "lucide-react";

// Client-side utility to generate tags (same as in create quote page)
const generateTagsFromText = (text: string): string[] => {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b(\w{4,})\b/g) || []; // Words with 4+ chars
  const wordCounts: { [key: string]: number } = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.quoteId as string;

  const [quoteText, setQuoteText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const [originalQuote, setOriginalQuote] = useState<QuotePageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (quoteId) {
      setIsFetching(true);
      getQuoteById(quoteId)
        .then(data => {
          if (data) {
            setOriginalQuote(data);
            setQuoteText(data.text);
            setAuthorName(data.authorName);
            setTags(data.tags || []);
          } else {
            notFound(); // Or setError("Quote not found and redirect");
          }
        })
        .catch(err => {
          console.error("Failed to fetch quote:", err);
          setError("Failed to load quote data. Please try again.");
          // Consider redirecting or showing a more permanent error
        })
        .finally(() => setIsFetching(false));
    }
  }, [quoteId]);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 7) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateTags = () => {
    const generated = generateTagsFromText(quoteText);
    const newTags = Array.from(new Set([...tags, ...generated])).slice(0, 7); // Merge and limit
    setTags(newTags);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload: UpdateQuotePayload = {
      text: quoteText,
      authorName: authorName,
      tags: tags,
    };

    const result = await updateQuote(quoteId, payload);

    if (result.success && result.data) {
      setSuccessMessage(result.message);
      setOriginalQuote(result.data);
      setTimeout(() => {
        router.push(`/quotes/${quoteId}`);
      }, 1500);
    } else {
      setError(result.message || "Failed to update quote.");
    }
    setIsLoading(false);
  };

  const handleDeleteQuote = async () => {
    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    const result = await deleteQuote(quoteId);
    if (result.success) {
      // For a better UX, a toast notification would be good here.
      // For now, we'll redirect and potentially show a message on the target page.
      router.push('/quotes/page/1?deleted=true'); // Or user's profile quotes page
    } else {
      setError(result.message || "Failed to delete quote.");
      setIsDeleting(false); // Only stop loading on error, on success we redirect
    }
    // No setIsDeleting(false) here on success because we navigate away
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading quote for editing...</p>
      </div>
    );
  }

  if (error && !originalQuote && !isDeleting) {
    return (
       <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl text-center">
         <Alert variant="destructive">
           <Terminal className="h-4 w-4" />
           <AlertTitle>Error Loading Quote</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
         <Button onClick={() => router.back()} className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
       </div>
    );
  }

  if (!originalQuote && !isFetching) {
     notFound(); // Should have been caught by getQuoteById logic, but as a safeguard.
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <Link href={`/quotes/${quoteId}`} passHref>
          <Button variant="outline" size="sm" className="text-sm" disabled={isDeleting || isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quote
          </Button>
        </Link>
      </div>

      <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <Edit className="mx-auto h-8 w-8 text-primary mb-2" />
          <CardTitle className="text-3xl font-bold text-center">Edit Quote</CardTitle>
          <CardDescription className="text-center pt-1">
            Refine the wisdom. Make your changes below for &ldquo;{originalQuote?.text.substring(0,50)}...&rdquo;.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="quoteText">Quote Text</Label>
              <Textarea
                id="quoteText"
                placeholder="Enter the quote..."
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                required
                className="bg-input/70 text-base min-h-[120px]"
                rows={5}
                disabled={isLoading || isDeleting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="authorName">Author Name</Label>
              <Input
                id="authorName"
                type="text"
                placeholder="Enter author's name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                className="bg-input/70 text-base"
                disabled={isLoading || isDeleting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (up to 7)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="currentTag"
                  type="text"
                  placeholder="Add a tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentTag.trim()) {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="bg-input/70 text-base"
                  disabled={tags.length >= 7 || isLoading || isDeleting}
                />
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={tags.length >= 7 || !currentTag.trim() || isLoading || isDeleting}>Add Tag</Button>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerateTags} className="mt-1 text-xs justify-start px-1 text-primary hover:text-primary/80" disabled={!quoteText.trim() || isLoading || isDeleting}>
                 Auto-generate Tags from Text (experimental)
              </Button>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 border border-border/50 rounded-md bg-background/30 min-h-[40px]">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-sm px-2 py-0.5 font-normal bg-primary/10 text-primary hover:bg-primary/20">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1.5 text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 aspect-square flex items-center justify-center"
                        aria-label={`Remove ${tag}`}
                        disabled={isLoading || isDeleting}
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {(error && !successMessage) && (
              <Alert variant="destructive" className="mt-2">
                <Terminal className="h-4 w-4" />
                <AlertTitle>{isDeleting ? 'Deletion Failed' : (isLoading ? 'Update Failed' : 'Error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert variant="default" className="mt-2 bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-400" />
                <AlertTitle className="!text-green-700 dark:!text-green-500">Success!</AlertTitle>
                <AlertDescription className="!text-green-600 dark:!text-green-300">{successMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between items-center pt-4 pb-6 border-t border-border/50">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" disabled={isLoading || isDeleting || isFetching}>
                  <Trash2Icon className="mr-2 h-4 w-4" /> Delete Quote
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this quote.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteQuote}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...</> : "Yes, delete quote"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex space-x-3">
                <Link href={`/quotes/${quoteId}`} passHref>
                    <Button variant="outline" type="button" disabled={isLoading || isDeleting || isFetching}>
                        Cancel
                    </Button>
                </Link>
                <Button
                  type="submit"
                  className="font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-shadow duration-150 ease-in-out"
                  style={{ backgroundImage: 'var(--gradient-primary-button)' }}
                  disabled={isLoading || isDeleting || isFetching}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Changes...</>
                  ) : (
                    <><Save className="mr-2 h-5 w-5" /> Save Changes</>
                  )}
                </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}