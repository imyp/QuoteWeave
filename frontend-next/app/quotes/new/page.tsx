'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlusCircle, Terminal, Loader2, Sparkles } from "lucide-react"

interface NewQuotePayload {
  text: string;
  authorName: string;
  tags?: string[];
  collectionIds?: string[];
  isPublic?: boolean;
}

async function submitNewQuote(payload: NewQuotePayload): Promise<{ id: string } | { error: string }> {
  console.log("API CALL (mock): Submitting new quote:", payload);
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (payload.text && payload.authorName) {
    if (payload.text.toLowerCase().includes("fail")) {
        return { error: "Quote submission failed due to server validation: 'fail' keyword detected." };
    }
    return { id: `quote${Math.floor(Math.random() * 1000) + 50}` };
  } else {
    return { error: "Quote text and author name are required." };
  }
}

// Simple client-side tag generator
function generateTagsFromText(text: string): string[] {
  if (!text.trim()) return [];
  const commonWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can',
    'could', 'may', 'might', 'must', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
    'in', 'on', 'at', 'by', 'from', 'to', 'with', 'about', 'above', 'after',
    'again', 'against', 'all', 'am', 'as', 'it', 'its', 'itself', 'let\'s', 'me',
    'more', 'most', 'my', 'myself', 'no', 'not', 'of', 'off', 'once', 'only', 'other', 'ought',
    'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'he', 'him', 'his', 'her',
    'hers', 'herself', 'himself', 'that', 'those', 'then', 'there', 'these',
    'they', 'this', 'through', 'thus', 'too', 'under', 'until', 'up', 'very', 'what',
    'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'how', 'i', 'you', 'your', 'yours'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/); // Split by spaces

  const potentialTags = words
    .filter(word => word.length > 3 && !commonWords.has(word))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)); // Capitalize

  // Get unique tags and limit to a few (e.g., 5)
  const uniqueTags = Array.from(new Set(potentialTags));
  return uniqueTags.slice(0, Math.min(uniqueTags.length, 5));
}

export default function NewQuotePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerateTags = async () => {
    if (!text.trim()) {
      setError("Please enter some quote text first to generate tags.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsGeneratingTags(true);
    // Simulate a slight delay for UX, as if an API call was made
    await new Promise(resolve => setTimeout(resolve, 300));
    const suggestedTags = generateTagsFromText(text);
    setTags(suggestedTags.join(', '));
    setIsGeneratingTags(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: NewQuotePayload = {
      text,
      authorName,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      isPublic: true,
    };

    const result = await submitNewQuote(payload);

    if ('id' in result) {
      setSuccessMessage(`Quote successfully created! ID: ${result.id}. Redirecting...`);
      setTimeout(() => {
        router.push(`/quotes/${result.id}`);
      }, 2000);
      setText('');
      setAuthorName('');
      setTags('');
    } else {
      setError(result.error || "An unexpected error occurred.");
    }
    setIsSubmitting(false);
  };

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
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="tags" className="text-base">Tags (comma-separated)</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTags}
                    disabled={isGeneratingTags || !text.trim()}
                    className="text-xs tracking-wide"
                >
                  {isGeneratingTags ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Generate
                </Button>
              </div>
              <Input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., wisdom, philosophy, life"
                className="text-base mt-1"
              />
              <p className="text-xs text-muted-foreground pt-1">
                Help others discover your quote by adding relevant tags, or auto-generate them based on the quote text.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-6 pb-8 pt-6 border-t border-border/50">
            {error && (
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
            <Button type="submit" className="w-full text-base py-3" disabled={isSubmitting}>
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
