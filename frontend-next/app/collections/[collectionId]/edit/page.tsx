'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ArrowLeft, CheckCircle, Edit3Icon, Loader2, Save, Terminal, Trash2Icon } from "lucide-react";
import { getCollectionDetailsById, updateCollection, UpdateCollectionPayload, CollectionDetails, deleteCollection } from "@/lib/collection-utils";

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.collectionId as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [originalCollection, setOriginalCollection] = useState<CollectionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (collectionId) {
      setIsFetching(true);
      getCollectionDetailsById(collectionId)
        .then(data => {
          if (data) {
            setOriginalCollection(data);
            setName(data.name);
            setDescription(data.description || '');
            setIsPublic(data.isPublic);
          } else {
            notFound();
          }
        })
        .catch(err => {
          console.error("Failed to fetch collection for editing:", err);
          setError("Failed to load collection data. Please try again or go back.");
        })
        .finally(() => setIsFetching(false));
    }
  }, [collectionId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload: UpdateCollectionPayload = {
      name,
      description,
      isPublic,
    };

    const result = await updateCollection(collectionId, payload);

    if (result.success && result.data) {
      setSuccessMessage(result.message);
      setOriginalCollection(result.data);
      setTimeout(() => {
        router.push(`/collections/${collectionId}`);
      }, 1500);
    } else {
      setError(result.message || "Failed to update collection.");
    }
    setIsLoading(false);
  };

  const handleDeleteCollection = async () => {
    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    const result = await deleteCollection(collectionId);

    if (result.success) {
      console.log(result.message);
      router.push('/collections?deleted=true');
    } else {
      setError(result.message || "Failed to delete collection.");
    }
    setIsDeleting(false);
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading collection for editing...</p>
      </div>
    );
  }

  if (error && !originalCollection && !isDeleting) {
    return (
       <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl text-center">
         <Alert variant="destructive">
           <Terminal className="h-4 w-4" />
           <AlertTitle>Error Loading Collection</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
         <Button onClick={() => router.back()} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
         </Button>
       </div>
    );
  }

  if (!originalCollection && !isFetching) {
     notFound();
     return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <Link href={`/collections/${collectionId}`} passHref>
          <Button variant="outline" size="sm" className="text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </Link>
      </div>

      <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <Edit3Icon className="mx-auto h-8 w-8 text-primary mb-2" />
          <CardTitle className="text-3xl font-bold text-center">Edit Collection</CardTitle>
          <CardDescription className="text-center pt-1">
            Modify the details of &ldquo;{originalCollection?.name || 'this collection'}&rdquo;.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="collectionName">Collection Name</Label>
              <Input
                id="collectionName"
                type="text"
                placeholder="Enter collection name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-input/70 text-base"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="collectionDescription">Description (Optional)</Label>
              <Textarea
                id="collectionDescription"
                placeholder="Provide a brief description of the collection..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-input/70 text-base min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-3 rounded-md border p-4 bg-input/30">
                <Label htmlFor="isPublicSwitch" className="flex-grow cursor-pointer">
                    <span className="font-medium text-foreground">Public Collection</span>
                    <p className="text-xs text-muted-foreground">
                        {isPublic ? "Visible to everyone." : "Only visible to you."}
                    </p>
                </Label>
                <Switch
                    id="isPublicSwitch"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    aria-label="Toggle public status"
                />
            </div>

            {(error && !successMessage) && (
              <Alert variant="destructive" className="mt-2">
                <Terminal className="h-4 w-4" />
                <AlertTitle>{isDeleting ? 'Deletion Failed' : 'Update Failed'}</AlertTitle>
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
                  <Trash2Icon className="mr-2 h-4 w-4" /> Delete Collection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the collection
                    &ldquo;{originalCollection?.name || 'this collection'}&rdquo; and all its associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCollection}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...</> : "Yes, delete collection"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex space-x-3">
                <Link href={`/collections/${collectionId}`} passHref>
                    <Button variant="outline" type="button" disabled={isLoading || isDeleting}>
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