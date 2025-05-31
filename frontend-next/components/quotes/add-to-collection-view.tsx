'use client';

import { useEffect, useState } from 'react';
import { UserCollection, getMyCollections, addQuoteToCollection, removeQuoteFromCollection, QuotePageEntry } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AddToCollectionViewProps {
  quote: QuotePageEntry;
  userId: number | null;
  authToken: string | null;
  onCollectionUpdate: () => void;
}

export default function AddToCollectionView({ quote, userId, authToken, onCollectionUpdate }: AddToCollectionViewProps) {
  const [userOwnedCollections, setUserOwnedCollections] = useState<UserCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManagementUI, setShowManagementUI] = useState(false);

  const [quoteInUserCollections, setQuoteInUserCollections] = useState(quote.userCollections || []);

  useEffect(() => {
    setQuoteInUserCollections(quote.userCollections || []);
  }, [quote.userCollections]);

  useEffect(() => {
    if (authToken && userId !== null) {
      setIsLoadingCollections(true);
      setError(null);
      getMyCollections(authToken)
        .then(data => {
          const collections: UserCollection[] = (data || []).map(c => ({
            ...c,
            authorName: c.authorName || 'Unknown Author'
          }));
          setUserOwnedCollections(collections);
        })
        .catch(err => {
          console.error("Failed to fetch user collections:", err);
          setError("Could not load your collections.");
          toast.error("Error", { description: "Could not load your collections." });
        })
        .finally(() => setIsLoadingCollections(false));
    }
  }, [authToken, userId]);

  const isQuoteInSelectedCollection = selectedCollectionId ?
    quoteInUserCollections.some(uc => uc.id === Number(selectedCollectionId)) : false;

  const handleCollectionAction = async () => {
    if (!selectedCollectionId || !authToken || !quote.id) {
      toast.warning("No Collection Selected", {
        description: "Please select a collection first.",
      });
      return;
    }

    setIsUpdatingCollection(true);
    setError(null);
    const collectionIdNum = Number(selectedCollectionId);
    const currentCollection = userOwnedCollections.find(c => c.id === collectionIdNum);

    try {
      if (isQuoteInSelectedCollection) {
        await removeQuoteFromCollection(collectionIdNum, quote.id, authToken);
        toast.success("Quote Removed", {
          description: `Quote removed from collection: ${currentCollection?.name || 'selected collection'}.`,
        });
        setQuoteInUserCollections(prev => prev.filter(uc => uc.id !== collectionIdNum));
      } else {
        await addQuoteToCollection(collectionIdNum, quote.id, authToken);
        toast.success("Quote Added", {
          description: `Quote added to collection: ${currentCollection?.name || 'selected collection'}.`,
        });
        if (currentCollection) {
            setQuoteInUserCollections(prev => [...prev, {id: currentCollection.id, name: currentCollection.name}]);
        }
      }
      onCollectionUpdate();
    } catch (err) {
      console.error("Failed to update collection:", err);
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
        if (err.message.toLowerCase().includes("duplicate key value violates unique constraint")) {
          errorMessage = "This quote is already in the selected collection.";
           // Optionally, refresh state to ensure UI consistency if it got out of sync
           if (currentCollection && !quoteInUserCollections.some(uc => uc.id === currentCollection.id)) {
             setQuoteInUserCollections(prev => [...prev, {id: currentCollection.id, name: currentCollection.name}]);
           }
        } else if (err.message.toLowerCase().includes("not found")) {
            errorMessage = "Operation failed: The quote or collection could not be found.";
        }
      }
      setError(`Failed to update collection: ${errorMessage}`);
      toast.error("Error Updating Collection", {
        description: `${errorMessage}`,
      });
    }
    finally {
      setIsUpdatingCollection(false);
    }
  };

  if (!authToken || userId === null) {
    return <p className="text-sm text-muted-foreground">Please log in to manage collections.</p>;
  }

  if (isLoadingCollections) {
    return <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching collections...</div>;
  }

  if (error && userOwnedCollections.length === 0 && !isLoadingCollections) {
    return (
      <div className="text-sm text-red-600 flex items-center">
        <AlertCircle className="mr-2 h-4 w-4" /> {error}
      </div>
    );
  }

  if (userOwnedCollections.length === 0 && !isLoadingCollections && showManagementUI) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <Button variant="ghost" onClick={() => setShowManagementUI(false)} size="sm" className="mb-2">
          &times; Hide
        </Button>
        <p className="text-sm text-muted-foreground">
          You have no collections.
          <Link href="/collections/new" className="text-primary hover:underline ml-1">
            Create one now
          </Link>
          to manage your quotes.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      {!showManagementUI ? (
        <Button variant="outline" onClick={() => setShowManagementUI(true)} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Manage in Collections
        </Button>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-foreground">Manage in Collections</h3>
            <Button variant="ghost" onClick={() => setShowManagementUI(false)} size="sm">
                &times; Hide
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select
                value={selectedCollectionId}
                onValueChange={setSelectedCollectionId}
                disabled={isUpdatingCollection || userOwnedCollections.length === 0}
            >
                <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder={userOwnedCollections.length === 0 ? "No collections found" : "Select a collection"} />
                </SelectTrigger>
                <SelectContent>
                {userOwnedCollections.map(collection => (
                    <SelectItem key={collection.id} value={String(collection.id)}>
                    {collection.name} ({quoteInUserCollections.some(uc => uc.id === collection.id) ? 'In collection' : 'Not in collection'})
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            <Button
                onClick={handleCollectionAction}
                disabled={!selectedCollectionId || isUpdatingCollection || userOwnedCollections.length === 0}
                variant={isQuoteInSelectedCollection ? "destructive" : "default"}
                className="w-[120px]"
            >
                {isUpdatingCollection ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isQuoteInSelectedCollection ? (
                <MinusCircle className="mr-2 h-4 w-4" />
                ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {isQuoteInSelectedCollection ? 'Remove' : 'Add'}
            </Button>
          </div>
          {error && !isLoadingCollections && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </>
      )}
    </div>
  );
}