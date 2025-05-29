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
import { FolderPlus, Terminal, Loader2 } from "lucide-react"

interface NewCollectionPayload {
  name: string;
  description?: string;
  isPublic: boolean;
  // quoteIds?: string[]; // For adding existing quotes during creation (more complex UI)
}

async function submitNewCollection(payload: NewCollectionPayload): Promise<{ id: string } | { error: string }> {
  console.log("API CALL (mock): Submitting new collection:", payload);
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (payload.name) {
    if (payload.name.toLowerCase().includes("fail")) {
        return { error: "Collection creation failed due to server validation: 'fail' keyword detected." };
    }
    return { id: `col${Math.floor(Math.random() * 1000) + 50}` };
  } else {
    return { error: "Collection name is required." };
  }
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: NewCollectionPayload = {
      name,
      description,
      isPublic,
    };

    const result = await submitNewCollection(payload);

    if ('id' in result) {
      setSuccessMessage(`Collection successfully created! ID: ${result.id}. Redirecting...`);
      setTimeout(() => {
        router.push(`/collections/${result.id}`);
      }, 2000);
      setName('');
      setDescription('');
      setIsPublic(true);
    } else {
      setError(result.error || "An unexpected error occurred.");
    }
    setIsSubmitting(false);
  };

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