import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-10rem)]">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <section className="prose prose-lg dark:prose-invert max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>
          By accessing or using QuoteWeave (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of the terms, then you may not access the Service.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">2. User Accounts</h2>
        <p>
          When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">3. Content</h2>
        <p>
          Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material (&quot;Content&quot;). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
        </p>
        <p>
          By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service. You retain any and all of your rights to any Content you submit, post or display on or through the Service and you are responsible for protecting those rights.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">4. Intellectual Property</h2>
        <p>
          The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of QuoteWeave and its licensors.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">5. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">6. Limitation Of Liability</h2>
        <p>
          In no event shall QuoteWeave, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">7. Changes To Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">8. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
        </p>
      </section>

      <section className="text-center mt-16">
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Back to Home
        </Link>
      </section>
    </div>
  );
}