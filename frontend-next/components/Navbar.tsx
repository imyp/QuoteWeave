'use client'; // Required for using client-side hooks like useAuth

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {LogOutIcon, UserCircle2Icon } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { isAuthenticated, logout, isLoading } = useAuth();

  return (
    <nav className="bg-card/80 backdrop-blur-md shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center text-foreground">
              <Image
                src="/logo.svg"
                alt="QuoteWeave Polaroid Rainbow Icon"
                width={30}
                height={36}
                className="mr-2 h-9 w-auto"
              />
              <span className="font-mono text-xl font-semibold tracking-tight">
                QuoteWeave
              </span>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                <Link href="/quotes" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors ">Quotes</Link>
                <Link href="/collections" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Collections</Link>
                <Link href="/tags" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Tags</Link>
                <Link href="/search" className="flex items-center text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">
                  Search
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-2">
              <Link href="/quotes/new"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-md">
                Create Quote
              </Link>
              <Link href="/collections/new"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-md">
                Create Collection
              </Link>
              {isLoading ? (
                <div className="w-20 h-8 bg-muted/50 rounded-md animate-pulse"></div>
              ) : isAuthenticated ? (
                <>
                  <Link href="/profile"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors flex items-center">
                    <UserCircle2Icon className="h-5 w-5 mr-1" /> Profile
                  </Link>
                  <Button onClick={() => logout()} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                    <LogOutIcon className="h-5 w-5 mr-1" /> Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Log In</Link>
                  <Link
                    href="/signup"
                    className="text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold transition-all duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none
                    focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    style={{ backgroundImage: 'var(--gradient-signup-button)' }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}