'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle, Loader2, Save, Terminal, UserCog } from "lucide-react";
import Link from 'next/link';
import { mockUser } from "@/lib/user-utils"; // Import shared mock user

// Mock API function for updating profile
async function updateUserProfile(payload: { username: string; email: string; bio: string }): Promise<{ success: boolean; message: string; error?: string }> {
  console.log("API CALL (mock): Updating profile with:", payload);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  // Simulate potential errors
  if (payload.username.toLowerCase().includes("error")) {
    return { success: false, message: "Failed to update profile. Username is invalid.", error: "invalid_username" };
  }
  if (payload.email === "taken@example.com"){
    return { success: false, message: "This email is already taken.", error: "email_taken" };
  }

  // Update THE SHARED mockUser data
  mockUser.username = payload.username;
  mockUser.email = payload.email;
  mockUser.bio = payload.bio;

  return { success: true, message: "Profile updated successfully!" };
}

export default function EditProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill form with current user data from SHARED mockUser
    setUsername(mockUser.username);
    setEmail(mockUser.email);
    setBio(mockUser.bio);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await updateUserProfile({ username, email, bio });

    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        router.push('/profile'); // Redirect to profile page on success
      }, 1500);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)]">
       <div className="mb-6">
        <Link href="/profile" passHref>
          <Button variant="outline" size="sm" className="text-sm">
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a little about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-input/70 text-base min-h-[100px]"
                rows={4}
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