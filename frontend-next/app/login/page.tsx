'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogInIcon, Terminal, Loader2, CheckCircle } from "lucide-react";
import { loginUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Mock API function for login
// async function submitLogin(payload: { username?: string, email?: string, password?: string }): Promise<{ success: boolean; message: string; error?: string }> {
//   console.log("API CALL (mock): Logging in with:", payload);
//   await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

//   if ((payload.username === "user" || payload.email === "user@example.com") && payload.password === "password123") {
//     return { success: true, message: "Login successful! Redirecting..." };
//   }
//   if (payload.username?.toLowerCase().includes("fail")){
//     return { success: false, message: "Login failed. Server validation error.", error: "server_validation_fail" };
//   }
//   return { success: false, message: "Invalid username or password.", error: "invalid_credentials" };
// }

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin, isAuthenticated } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEmailLogin, setIsEmailLogin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (searchParams.get('signupSuccess') === 'true') {
      setSuccessMessage("Account created successfully! Please log in.");
      router.replace('/login', { scroll: false });
    }
    const loginMessage = searchParams.get('message');
    if (loginMessage) {
        setError(loginMessage);
        router.replace('/login', { scroll: false });
    }

  }, [searchParams, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier || !password) {
      setError("Please enter both username/email and password.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tokenResponse = await loginUser(identifier, password);
      if (tokenResponse.access_token) {
        authLogin(tokenResponse.access_token);
        setSuccessMessage("Login successful! Redirecting...");
      } else {
        throw new Error('Access token not found in response');
      }
    } catch (apiError: unknown) {
      console.error("Login API error:", apiError);
      let displayError = "Login failed. Please try again.";
      if (apiError instanceof Error && apiError.message) {
        if (apiError.message.includes("Incorrect username or password") || apiError.message.includes("400")) {
            displayError = "Invalid username/email or password.";
        } else {
            displayError = apiError.message;
        }
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to toggle between username and email login
  const toggleLoginType = () => {
    setIsEmailLogin(!isEmailLogin);
    setIdentifier(''); // Reset identifier field on toggle
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
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
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                name="identifier"
                type={isEmailLogin ? "email" : "text"}
                autoComplete={isEmailLogin ? "email" : "username"}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isEmailLogin ? "you@example.com" : "yourusername"}
                className="appearance-none block w-full px-3 py-2 border border-input bg-background/60 rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                disabled={isLoading}
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
            <div className="text-sm text-right mb-4">
              <button
                type="button"
                onClick={toggleLoginType}
                className="font-medium text-primary hover:text-primary/80 focus:outline-none"
                disabled={isLoading}
              >
                {isEmailLogin ? "Login with Username instead" : "Login with Email instead"}
              </button>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}