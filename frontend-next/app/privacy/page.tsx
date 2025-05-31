import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-10rem)]">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <section className="prose prose-lg dark:prose-invert max-w-3xl mx-auto">
        <p className="mb-4 text-muted-foreground">
          At QuoteWeave, we are committed to protecting your privacy. This Privacy Policy outlines how we collect,
          use, disclose, and safeguard your information when you use our platform. Please read this policy carefully.
          If you do not agree with the terms of this privacy policy, please do not access the site.
        </p>
        <p className="mb-4 text-muted-foreground">
          We reserve the right to make changes to this Privacy Policy at any time and for any reason.
          We will alert you about any changes by updating the &ldquo;Last Updated&rdquo; date of this Privacy Policy.
          You are encouraged to periodically review this Privacy Policy to stay informed of updates. You will be
          deemed to have been made aware of, will be subject to, and will be deemed to have accepted the changes in any
          revised Privacy Policy by your continued use of the Application after the date such revised Privacy Policy is posted.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">1. Information We Collect</h2>
        <p>
          We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we&apos;re collecting it and how it will be used.
        </p>
        <p>
          Information we collect may include:
        </p>
        <ul>
          <li>Log data: Like most website operators, we collect information that your browser sends whenever you visit our Service. This Log Data may include information such as your computer&apos;s Internet Protocol (&quot;IP&quot;) address, browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages and other statistics.</li>
          <li>Personal Information: Information you provide when you register for an account, such as your name, email address, and profile information.</li>
          <li>User Content: Quotes, collections, and other content you create or upload to the Service.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-8">2. How We Use Your Information</h2>
        <p>
          We use the information we collect in various ways, including to:
        </p>
        <ul>
          <li>Provide, operate, and maintain our Service</li>
          <li>Improve, personalize, and expand our Service</li>
          <li>Understand and analyze how you use our Service</li>
          <li>Develop new products, services, features, and functionality</li>
          <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the Service, and for marketing and promotional purposes</li>
          <li>Send you emails</li>
          <li>Find and prevent fraud</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-8">3. Security of Your Information</h2>
        <p>
          We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">4. Cookies</h2>
        <p>
          We use cookies to help us remember and process the items in your shopping cart, understand and save your preferences for future visits and compile aggregate data about site traffic and site interaction so that we can offer better site experiences and tools in the future.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">5. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8">6. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
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