'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch"; // For notification toggles
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For theme selection
import { ArrowLeft, Bell, KeyRound, Palette, Save, Loader2, Terminal, CheckCircle, LogIn } from "lucide-react";
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from "@/components/theme-provider"; // Use our re-exported useTheme
import { useAuth } from "@/lib/auth"; // Import useAuth
import {
  changePassword, ChangePasswordPayload,
  updateUserPreferences, UpdateUserPreferencesPayload,
  getCurrentUserProfile, // Import to fetch current preferences
  UserProfileResponse // Changed User to UserProfileResponse
} from '@/lib/api';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { token: authToken, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isFetchingPreferences, setIsFetchingPreferences] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (authIsLoading) {
        setIsFetchingPreferences(true);
        return;
    }
    if (!isAuthenticated) {
        setIsFetchingPreferences(false);
        return;
    }
    if (authToken) {
        setIsFetchingPreferences(true);
        getCurrentUserProfile(authToken)
            .then((profile: UserProfileResponse) => { // Changed to UserProfileResponse
                if (profile) {
                    setEmailNotifications(profile.email_notifications ?? true); // Adjusted to UserProfileResponse structure
                    setPushNotifications(profile.push_notifications ?? false); // Adjusted to UserProfileResponse structure
                }
            })
            .catch(err => {
                console.error("Failed to fetch initial preferences:", err);
                setPreferencesError("Could not load your current preferences.");
            })
            .finally(() => setIsFetchingPreferences(false));
    } else {
        setIsFetchingPreferences(false);
    }
  }, [authIsLoading, isAuthenticated, authToken]);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isAuthenticated || !authToken) {
        setPasswordError("You must be logged in to change your password.");
        return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    setIsSavingPassword(true);

    try {
      const payload: ChangePasswordPayload = { current_password: currentPassword, new_password: newPassword };
      await changePassword(payload, authToken);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (apiError: unknown) { // Changed to unknown type
      console.error("Password change API error:", apiError);
      const message = (apiError instanceof Error) ? apiError.message : "Failed to update password. Please try again."; // Adjusted error handling
      setPasswordError(message);
      setTimeout(() => setPasswordError(null), 5000);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!isAuthenticated || !authToken) {
        setPreferencesError("You must be logged in to save preferences.");
        return;
    }
    setIsSavingPreferences(true);
    setPreferencesError(null);
    setPreferencesSuccess(null);

    const payload: UpdateUserPreferencesPayload = {
      email_notifications: emailNotifications,
      push_notifications: pushNotifications,
    };

    try {
      await updateUserPreferences(payload, authToken);
      setPreferencesSuccess("Preferences saved successfully!");
      setTimeout(() => setPreferencesSuccess(null), 3000);
    } catch (apiError: unknown) { // Changed to unknown type
      console.error("Save preferences API error:", apiError);
      const message = (apiError instanceof Error) ? apiError.message : "Failed to save preferences. Please try again."; // Adjusted error handling
      setPreferencesError(message);
      setTimeout(() => setPreferencesError(null), 5000);
    } finally {
      setIsSavingPreferences(false);
    }
  }

  if (!mounted || authIsLoading || isFetchingPreferences) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl min-h-[calc(100vh-4rem)] flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading settings...</p>
        </div>
    );
  }

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
          <CardTitle className="text-3xl font-bold text-center">Settings</CardTitle>
          <CardDescription className="text-center pt-1">
            Manage your account settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 py-6">
          {/* Change Password Section */}
          <form onSubmit={handlePasswordChange}>
            <Card className="bg-background/50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="bg-input/70" disabled={!isAuthenticated}/>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="bg-input/70" disabled={!isAuthenticated}/>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-input/70" disabled={!isAuthenticated}/>
                </div>
                {passwordError && <Alert variant="destructive" className="text-xs"><Terminal className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{passwordError}</AlertDescription></Alert>}
                {passwordSuccess && <Alert variant="default" className="text-xs bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400"><CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-400" /><AlertTitle>Success</AlertTitle><AlertDescription>{passwordSuccess}</AlertDescription></Alert>}
                {!isAuthenticated && !authIsLoading && (
                    <Alert variant="default" className="text-xs bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
                        <LogIn className="h-4 w-4 !text-yellow-700 dark:!text-yellow-400" />
                        <AlertTitle className="!text-yellow-700 dark:!text-yellow-500">Login Required</AlertTitle>
                        <AlertDescription className="!text-yellow-600 dark:!text-yellow-300">You need to be logged in to change your password. <Link href="/login" className="underline hover:text-yellow-500 dark:hover:text-yellow-200">Login here</Link>.</AlertDescription>
                    </Alert>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button type="submit" size="sm" disabled={isSavingPassword || !isAuthenticated} className="ml-auto">
                  {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Update Password
                </Button>
              </CardFooter>
            </Card>
          </form>

          <Separator />

          {/* Notification Preferences Section */}
          <Card className="bg-background/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2 p-1">
                <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                  <span>Email Notifications</span>
                  <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Receive important updates and notifications via email.
                  </span>
                </Label>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled={!isAuthenticated}/>
              </div>
              <div className="flex items-center justify-between space-x-2 p-1">
                <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
                  <span>Push Notifications</span>
                  <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Get real-time alerts directly on your device (if supported).
                  </span>
                </Label>
                <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} disabled={!isAuthenticated || true} />
              </div>
               {!isAuthenticated && !authIsLoading && (
                    <Alert variant="default" className="text-xs mt-2 bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
                        <LogIn className="h-4 w-4 !text-yellow-700 dark:!text-yellow-400" />
                        <AlertTitle className="!text-yellow-700 dark:!text-yellow-500">Login Required</AlertTitle>
                        <AlertDescription className="!text-yellow-600 dark:!text-yellow-300">You need to be logged in to change notification preferences. <Link href="/login" className="underline hover:text-yellow-500 dark:hover:text-yellow-200">Login here</Link>.</AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={handleSavePreferences} size="sm" disabled={isSavingPreferences || !isAuthenticated} className="ml-auto">
                    {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Preferences
                </Button>
            </CardFooter>
          </Card>

          <Separator />

          {/* Appearance Settings Section */}
          <Card className="bg-background/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={(newTheme: string) => setTheme(newTheme as 'light' | 'dark' | 'system')}>
                  <SelectTrigger id="theme" className="w-full bg-input/70">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how QuoteWeave looks to you. Select System Default to match your OS settings.
                </p>
              </div>
            </CardContent>
          </Card>

        </CardContent>
        <CardFooter className="border-t border-border/50 px-6 py-4 mt-8 flex flex-col items-end gap-4">
            {preferencesError && <Alert variant="destructive" className="text-xs w-full"><Terminal className="h-4 w-4" /><AlertTitle>Error Saving Preferences</AlertTitle><AlertDescription>{preferencesError}</AlertDescription></Alert>}
            {preferencesSuccess && <Alert variant="default" className="text-xs w-full bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400"><CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-400" /><AlertTitle>Preferences Saved</AlertTitle><AlertDescription>{preferencesSuccess}</AlertDescription></Alert>}
          <Button onClick={handleSavePreferences} className="ml-auto" disabled={isSavingPreferences || isSavingPassword}>
            {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save All Preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}