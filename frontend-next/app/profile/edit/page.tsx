'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle, Loader2, Save, Terminal, UserCog, LogIn } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/lib/auth";
import {
  getCurrentUserProfile,
  updateUserProfile,
  UpdateUserProfilePayload
} from '@/lib/api';


export default function EditProfilePage() {
  const router = useRouter();
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authIsLoading) {
      setIsFetchingInitialData(true);
      return;
    }

    if (!isAuthenticated) {
      setError("Please log in to edit your profile.");
      setIsFetchingInitialData(false);
      return;
    }

    if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        setIsFetchingInitialData(false);
        return;
    }

    setIsFetchingInitialData(true);
    getCurrentUserProfile(authToken)
      .then(profile => {
        if (profile) {
            setUsername(profile.username);
            setEmail(profile.email);
        }
      })
      .catch(err => {
        console.error("Failed to fetch user profile:", err);
        setError("Could not load your profile data. Please try again or log in.");
      })
      .finally(() => setIsFetchingInitialData(false));
  }, [authToken, isAuthenticated, authIsLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated || !authToken) {
        setError("You must be logged in to update your profile. Token is missing.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateUserProfilePayload = { username, email };

      const updatedProfile = await updateUserProfile(payload, authToken);
      setSuccessMessage("Profile updated successfully!");
      setUsername(updatedProfile.username);
      setEmail(updatedProfile.email);

      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "An unexpected error occurred.");
    }
    setIsLoading(false);
  };

  if (isFetchingInitialData || authIsLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if ((!authIsLoading && !isAuthenticated) || (error && !username && !email) ){
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{error ? "Error Loading Profile" : "Authentication Required"}</AlertTitle>
          <AlertDescription>
            {error || "Please log in to edit your profile."}
          </AlertDescription>
          <Button onClick={() => router.push('/login')} className="mt-4">
            <LogIn className="mr-2 h-4 w-4" /> Login
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)]">
       <div className="mb-6">
        <Link href="/profile" passHref>
          <Button variant="outline" size="sm" className="text-sm" disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </Link>
      </div>

      <Card className="w-full bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <UserCog className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-3xl font-bold text-center">Edit Profile</CardTitle>
          <CardDescription className="text-center pt-1">
            Update your personal information.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Your unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-input/70 text-base"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input/70 text-base"
                disabled={isLoading}
              />
            </div>
            {error && (
              <Alert variant="destructive" className="mt-2">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Update Failed</AlertTitle>
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
          <CardFooter className="flex justify-end space-x-3 pt-4 pb-6 border-t border-border/50">
            <Link href="/profile" passHref>
                <Button variant="outline" type="button" disabled={isLoading}>
                    Cancel
                </Button>
            </Link>
            <Button
              type="submit"
              className="font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-shadow duration-150 ease-in-out"
              style={{ backgroundImage: 'var(--gradient-primary-button)' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-5 w-5" /> Save Changes</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}