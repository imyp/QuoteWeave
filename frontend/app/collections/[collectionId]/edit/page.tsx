'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { getCollectionById, updateCollection, CollectionDetails, deleteCollection } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Terminal, ArrowLeft, Save, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isPublic: z.boolean(),
});

type EditCollectionFormValues = z.infer<typeof formSchema>;

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const collectionId = params.collectionId as string;

  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EditCollectionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
    },
  });

  useEffect(() => {
    if (!collectionId || authIsLoading) {
      return;
    }
    if (!isAuthenticated || !token) {
      toast.error('Authentication required', { description: 'You must be logged in to edit a collection.' });
      router.push('/login');
      return;
    }

    setIsLoading(true);
    getCollectionById(Number(collectionId), token)
      .then((data) => {
        if (data) {
          setCollection(data);
          form.reset({
            name: data.name,
            description: data.description || '',
            isPublic: data.isPublic,
          });
        } else {
          setError('Collection not found.');
          toast.error('Error', { description: 'Collection not found.' });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch collection:', err);
        setError(err.message || 'Failed to load collection details.');
        toast.error('Error loading collection', { description: err.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [collectionId, token, isAuthenticated, authIsLoading, router, form]);

  const onSubmit = async (values: EditCollectionFormValues) => {
    if (!collection || !token) return;

    setIsSubmitting(true);
    setError(null);

    const backendPayload = {
      name: values.name,
      description: values.description,
      isPublic: values.isPublic,
    };

    try {
      await updateCollection(collection.id, backendPayload, token);
      toast.success('Collection updated successfully!');
      router.push(`/collections/${collection.id}`);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to update collection:', error);
      const errorMessage = error.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error('Update failed', { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collection || !token) return;

    const confirmed = window.confirm("Are you sure you want to delete this collection? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteCollection(collection.id, token);
      toast.success('Collection deleted successfully!');
      router.push('/profile'); // Redirect to profile page or collections list
    } catch (err) {
      const error = err as Error;
      console.error('Failed to delete collection:', error);
      const errorMessage = error.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error('Delete failed', { description: errorMessage });
      setIsDeleting(false); // Only set to false on error, on success we redirect
    }
    // No finally block to set isDeleting to false here, because on success, the component unmounts.
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <p className="text-xl text-muted-foreground">Loading Collection Editor...</p>
      </div>
    );
  }

  if (error && !collection) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Collection</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
             <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </Alert>
      </div>
    );
  }

  if (!collection && !isLoading) {
     return (
        <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
            <Alert variant="default" className="max-w-lg">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Collection Not Found</AlertTitle>
                <AlertDescription>The collection you are trying to edit could not be found.</AlertDescription>
                 <Button onClick={() => router.push('/collections')} variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Collections
                </Button>
            </Alert>
        </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4 w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <CardTitle>Edit Collection</CardTitle>
          <CardDescription>Update the details of your collection &quot;{collection?.name}&quot;.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Controller
                name="name"
                control={form.control}
                render={({ field }) => <Input id="name" placeholder="My Awesome Collection" {...field} />}
              />
              {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={form.control}
                render={({ field }) => <Textarea id="description" placeholder="A brief description of what this collection is about..." {...field} />}
              />
              {form.formState.errors.description && <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>}
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <Controller
                name="isPublic"
                control={form.control}
                render={({ field }) => (
                  <Checkbox id="isPublic" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="isPublic" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Make this collection public
              </Label>
            </div>
             {error && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Update Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <div className="flex justify-between w-full">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCollection}
                disabled={isSubmitting || isDeleting || !collection}
                className="w-auto"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Collection
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting || !collection} className="w-auto">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}