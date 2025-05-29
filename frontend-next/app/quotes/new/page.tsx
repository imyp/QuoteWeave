'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlusCircle, Terminal, Loader2, Sparkles, LogIn } from "lucide-react"
import { useAuth } from "@/lib/auth";

// Import the actual API call function and payload type
import { createQuote, CreateQuoteClientPayload, generateTagsForQuote, GenerateTagsPayload } from '@/lib/api';

export default function NewQuotePage() {
  const router = useRouter();
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login?message=Please log in to create a new quote.');
    }
  }, [authIsLoading, isAuthenticated, router]);

  const handleGenerateTags = async () => {
    if (!text.trim()) {
      setError("Please enter some quote text first to generate tags.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!authorName.trim()) {
      setError("Please enter the author\'s name to help generate relevant tags.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!isAuthenticated) {
        setError("Please log in to use the AI tag generator.");
        return;
    }
    setIsGeneratingTags(true);
    setError(null);
    try {
      const payload: GenerateTagsPayload = { quote: text, author: authorName };
      const suggestedTags: string[] = await generateTagsForQuote(payload);

      if (suggestedTags && suggestedTags.length > 0) {
        const currentTagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        const combinedTags = Array.from(new Set([...currentTagsArray, ...suggestedTags]));
        const newTagsString = combinedTags.slice(0, 7).join(', ');
        setTags(newTagsString);
      } else {
        // Optional: setError("AI couldn't suggest any tags for this quote.");
      }
    } catch (err) {
      console.error("Failed to generate tags:", err);
      setError((err instanceof Error ? err.message : String(err)) || "Failed to generate tags.");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated || !authToken) {
        setError("You must be logged in to create a quote. Authentication token is missing.");
        setIsSubmitting(false);
        return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0 && tag.length <= 50);
    if (processedTags.length > 7) {
        setError("You can add a maximum of 7 tags.");
        setIsSubmitting(false);
        return;
    }

    const payload: CreateQuoteClientPayload = {
      text,
      authorName,
      tags: processedTags,
    };

    try {
      const newQuote = await createQuote(payload, authToken);
      setSuccessMessage(`Quote successfully created! ID: ${newQuote.id}. Redirecting...`);
      setTimeout(() => {
        router.push(`/quotes/${newQuote.id}`);
      }, 2000);
      setText('');
      setAuthorName('');
      setTags('');
    } catch (err) {
      console.error("Failed to submit new quote:", err);
      setError((err instanceof Error ? err.message : String(err)) || "An unexpected error occurred.");
    }
    setIsSubmitting(false);
  };

  if (authIsLoading || (!isAuthenticated && !error && !successMessage)) {
    return (
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading page...</p>
        </div>
    );
  }

  if (!isAuthenticated && error) {
     return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
          <Button onClick={() => router.push('/login')} className="mt-4 w-full">
            <LogIn className="mr-2 h-4 w-4" /> Login
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-xl bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <PlusCircle className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-3xl font-bold text-foreground">Create New Quote</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Share a new piece of wisdom, inspiration, or humor with the world.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 px-6 py-8">
            <div className="space-y-2">
              <Label htmlFor="quoteText" className="text-base">Quote Text</Label>
              <Textarea
                id="quoteText"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the quote here... e.g., &ldquo;The only true wisdom is in knowing you know nothing.&rdquo;"
                required
                rows={5}
                className="text-base resize-none"
                disabled={isSubmitting || !isAuthenticated}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorName" className="text-base">Author&apos;s Name</Label>
              <Input
                id="authorName"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g., Socrates"
                required
                className="text-base"
                disabled={isSubmitting || !isAuthenticated}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="tags" className="text-base">Tags (comma-separated, up to 7)</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTags}
                    disabled={isGeneratingTags || !text.trim() || !authorName.trim() || isSubmitting || !isAuthenticated}
                    className="text-xs tracking-wide"
                >
                  {isGeneratingTags ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Generate Tags (AI)
                </Button>
              </div>
              <Input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., wisdom, philosophy, life (max 7 tags)"
                className="text-base mt-1"
                disabled={isSubmitting || !isAuthenticated}
              />
              <p className="text-xs text-muted-foreground pt-1">
                Help others discover your quote by adding relevant tags (max 7, up to 50 chars each), or use the AI generator.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-6 pb-8 pt-6 border-t border-border/50">
            {error && (!successMessage) && (
              <Alert variant="destructive" className="w-full">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Submission Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert variant="default" className="w-full bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
                 <PlusCircle className="h-4 w-4 !text-green-700 dark:!text-green-400" />
                <AlertTitle className="!text-green-700 dark:!text-green-500">Success!</AlertTitle>
                <AlertDescription className="!text-green-600 dark:!text-green-300">{successMessage}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full text-base py-3" disabled={isSubmitting || isGeneratingTags || !isAuthenticated}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
              ) : (
                <><PlusCircle className="mr-2 h-5 w-5" /> Create Quote</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
