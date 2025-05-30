'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserPlus, Terminal, Loader2, CheckCircle } from "lucide-react";
import { registerUser, CreateUserPayload } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload: CreateUserPayload = { username, email, password };

    try {
      await registerUser(payload);
      setSuccessMessage("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push('/login?signupSuccess=true');
      }, 2000);
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error("Signup API error:", err);
      setError((err instanceof Error ? err.message : String(err)) || "An unexpected error occurred.");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
          <CardDescription className="pt-1">
            Join QuoteWeave to share and discover wisdom.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="yourusername"
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
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input/70 text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-input/70 text-base"
              />
            </div>
            {error && (
              <Alert variant="destructive" className="mt-2">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Signup Failed</AlertTitle>
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
          <CardFooter className="flex flex-col items-center pt-4 pb-6 border-t border-border/50">
            <Button
              type="submit"
              className="w-full font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-shadow duration-150 ease-in-out text-base py-3"
              style={{ backgroundImage: 'var(--gradient-primary-button)' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...</>
              ) : (
                <><UserPlus className="mr-2 h-5 w-5" /> Create Account</>
              )}
            </Button>
            <p className="mt-6 text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="font-semibold text-primary hover:text-primary/80 hover:underline">Log in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}