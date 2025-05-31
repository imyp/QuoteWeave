'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FolderPlus, Terminal, Loader2, LogIn } from "lucide-react"
import { createCollection, CreateCollectionPayload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function NewCollectionPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated || !token) {
      setError("Please log in to create a collection.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: CreateCollectionPayload = { name, description, isPublic };

    try {
      const newCollection = await createCollection(payload, token);
      setSuccessMessage(`Collection "${newCollection.name}" created successfully! ID: ${newCollection.id}. Redirecting...`);
      setTimeout(() => router.push(`/collections`), 1500);
    } catch (apiError: unknown) {
      console.error("Create collection API error:", apiError);
      let displayError = "Failed to create collection. Please try again.";
      if (apiError instanceof Error && apiError.message) {
        displayError = apiError.message;
      }
      setError(displayError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authIsLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md p-8 text-center bg-card/80 backdrop-blur-sm">
          <Terminal className="mx-auto h-10 w-10 text-destructive mb-4" />
          <CardTitle className="text-xl font-semibold mb-2">Authentication Required</CardTitle>
          <CardDescription className="mb-6">
            You need to be logged in to create a new collection.
          </CardDescription>
          <Button asChild className="w-full">
            <Link href="/login?redirect=/collections/new"><LogIn className="mr-2 h-4 w-4" /> Log In</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 flex justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-xl bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <FolderPlus className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-3xl font-bold text-foreground">Create New Collection</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Organize your favorite quotes into meaningful collections.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 px-6 py-8">
            <div className="space-y-2">
              <Label htmlFor="collectionName" className="text-base">Collection Name</Label>
              <Input
                id="collectionName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Stoic Wisdom, Morning Motivation"
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collectionDescription" className="text-base">Description (Optional)</Label>
              <Textarea
                id="collectionDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of what this collection is about..."
                rows={3}
                className="text-base resize-none"
              />
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="isPublic" className="text-base cursor-pointer">
                Publicly Visible
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1 pl-12">
              Allow others to discover and view this collection.
            </p>
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
                <FolderPlus className="h-4 w-4 !text-green-700 dark:!text-green-400" />
                <AlertTitle className="!text-green-700 dark:!text-green-500">Success!</AlertTitle>
                <AlertDescription className="!text-green-600 dark:!text-green-300">{successMessage}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full text-base py-3" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Collection...</>
              ) : (
                <><FolderPlus className="mr-2 h-5 w-5" /> Create Collection</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}