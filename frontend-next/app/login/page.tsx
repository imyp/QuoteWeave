'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogInIcon, Terminal, Loader2, CheckCircle } from "lucide-react";

// Mock API function for login
async function submitLogin(payload: { username?: string, email?: string, password?: string }): Promise<{ success: boolean; message: string; error?: string }> {
  console.log("API CALL (mock): Logging in with:", payload);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  if ((payload.username === "user" || payload.email === "user@example.com") && payload.password === "password123") {
    return { success: true, message: "Login successful! Redirecting..." };
  }
  if (payload.username?.toLowerCase().includes("fail")){
    return { success: false, message: "Login failed. Server validation error.", error: "server_validation_fail" };
  }
  return { success: false, message: "Invalid username or password.", error: "invalid_credentials" };
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await submitLogin({ username, password });

    if (result.success) {
      setSuccessMessage(result.message);
      // In a real app, you'd set auth tokens/session here
      setTimeout(() => {
        router.push('/'); // Redirect to homepage or dashboard
      }, 1500);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <LogInIcon className="mx-auto h-10 w-10 text-primary mb-3" />
          <CardTitle className="text-3xl font-bold">Log In</CardTitle>
          <CardDescription className="pt-1">
            Welcome back! Access your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="username">Username or Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="yourusername or email@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-input/70 text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input/70 text-base"
              />
            </div>
             {error && (
              <Alert variant="destructive" className="mt-2">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
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
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Logging In...</>
              ) : (
                <><LogInIcon className="mr-2 h-5 w-5" /> Log In</>
              )}
            </Button>
            <p className="mt-6 text-sm text-muted-foreground">
              Don&apos;t have an account? <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 hover:underline">Sign up</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}