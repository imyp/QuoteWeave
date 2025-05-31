"use client";

import { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, Send, Loader2, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setFeedbackMessage('');

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (email.includes("error")) {
        setStatus('error');
        setFeedbackMessage('There was an issue sending your message. Please try again.');
    } else {
        setStatus('success');
        setFeedbackMessage('Thank you for your message! We will get back to you soon.');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-10rem)]">
      <header className="mb-12 text-center">
        <Mail className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold text-primary sm:text-5xl">Contact Us</h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">We&apos;d love to hear from you! Send us a message and we&apos;ll respond as soon as possible.</p>
      </header>

      <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg shadow-lg">
        {status === 'success' && (
          <Alert className="mb-6 border-green-500 text-green-700 dark:border-green-600 dark:text-green-500">
            <CheckCircle2 className="h-4 w-4 !text-green-700 dark:!text-green-500" />
            <AlertTitle className="text-green-700 dark:text-green-500">Message Sent!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
                {feedbackMessage}
            </AlertDescription>
          </Alert>
        )}
        {status === 'error' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Sending Failed</AlertTitle>
            <AlertDescription>{feedbackMessage}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={status === 'loading'}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="What's this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={status === 'loading'}
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Your message here..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={status === 'loading'}
            />
          </div>
          <div className="text-right">
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-3 text-lg"
            >
              {status === 'loading' ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="mr-2 h-5 w-5" /> Send Message</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}