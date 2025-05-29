'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createCollection, type CreateCollectionPayload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

const collectionFormSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isPublic: z.boolean().optional(),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

export default function CreateCollectionPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
    },
    mode: 'onChange',
  });

  async function onSubmit(data: CollectionFormValues) {
    if (!isAuthenticated || !token) {
      toast.error('Authentication required', { description: 'Please log in to create a collection.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateCollectionPayload = {
        name: data.name,
        description: data.description || '',
        isPublic: data.isPublic ?? false,
      };
      const newCollection = await createCollection(payload, token);
      toast.success('Collection created!', {
        description: `Successfully created "${newCollection.name}".`,
      });
      // Redirect to the new collection's page (assuming a route like /collections/[id])
      // Or to a general collections list page
      router.push(`/collections`); // Or router.push(`/collections/${newCollection.id}`);
    } catch (error) {
      // Error is already toasted by fetchApi, but we can log it or add specific UI reaction here
      console.error("Failed to create collection:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    // Optionally, show a message and a link to login, or redirect
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4">Please log in to create a collection.</p>
        <Button asChild><Link href="/login">Log In</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" asChild className="mr-2">
                <Link href="/collections"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex-grow">
                <CardTitle className="text-2xl font-bold">Create New Collection</CardTitle>
                <CardDescription>Fill in the details for your new collection.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name</Label>
              <Input id="name" {...form.register('name')} placeholder="e.g., Stoic Wisdom, Morning Motivation" className="bg-input/70" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...form.register('description')} placeholder="A brief description of what this collection is about." className="bg-input/70" />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isPublic" {...form.register('isPublic')} checked={form.watch('isPublic')} onCheckedChange={(checked) => form.setValue('isPublic', checked)} />
              <Label htmlFor="isPublic">Make this collection public?</Label>
            </div>
            {form.formState.errors.isPublic && (
                <p className="text-sm text-destructive">{form.formState.errors.isPublic.message}</p>
            )}
             <CardFooter className="px-0 pt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full font-semibold" style={{ backgroundImage: 'var(--gradient-primary-button)' }}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Collection
                </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}