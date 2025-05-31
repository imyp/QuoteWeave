'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUserProfile, UserProfileResponse } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfileResponse | null;
  isLoading: boolean;
  login: (accessToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'authToken';

export const AuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          try {
            const userProfile = await getCurrentUserProfile(storedToken);
            setUser(userProfile);
          } catch (error) {
            console.error("Failed to fetch user profile on init:", error);
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (accessToken: string) => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    }
    setToken(accessToken);
    try {
      const userProfile = await getCurrentUserProfile(accessToken);
      setUser(userProfile);
    } catch (error) {
      console.error("Failed to fetch user profile on login:", error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    setToken(null);
    setUser(null);
  };

  const authContextValue: AuthContextType = {
    isAuthenticated: !!token && !!user,
    token,
    user,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};