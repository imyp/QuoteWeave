import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] overflow-x-hidden">
      <header className="py-16 sm:py-20 text-center bg-gradient-to-b from-background to-muted/30 dark:to-muted/20 animate-fadeInUp">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-primary sm:text-5xl lg:text-6xl">About QuoteWeave</h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto animate-fadeInUp delay-200ms">
            Discover the story, mission, and vision behind your personal tapestry of wisdom.
          </p>
        </div>
      </header>

      <section className="py-16 sm:py-20 bg-background animate-fadeInUp delay-300ms">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-semibold text-foreground mb-8 text-center sm:text-left">Our Mission</h2>
          <div className="prose prose-lg dark:prose-invert mx-auto sm:mx-0">
            <p className="text-lg sm:text-xl leading-relaxed">
              At QuoteWeave, our mission is to provide a beautiful and intuitive space for individuals to discover, create, organize, and share the wisdom encapsulated in quotes. We believe that words have the power to inspire, motivate, and connect us. Our platform is designed to be a personal tapestry where users can weave together the insights that resonate most deeply with them.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-muted/40 dark:bg-muted/25 animate-fadeInUp delay-400ms">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-semibold text-foreground mb-8 text-center sm:text-left">The Vision</h2>
          <div className="prose prose-lg dark:prose-invert mx-auto sm:mx-0">
            <p className="text-lg sm:text-xl leading-relaxed">
              We envision QuoteWeave as more than just a quote repository. We aim to foster a community of thinkers, dreamers, and learners who find joy in the art of expression and the pursuit of knowledge. Whether you&apos;re seeking a spark of inspiration, a moment of reflection, or a way to share your own insights, QuoteWeave is here to support your journey.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-background animate-fadeInUp delay-500ms">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-semibold text-foreground mb-8 text-center sm:text-left">Why &quot;Weave&quot;?</h2>
          <div className="prose prose-lg dark:prose-invert mx-auto sm:mx-0">
            <p className="text-lg sm:text-xl leading-relaxed">
              The name &quot;QuoteWeave&quot; reflects the idea of intertwining diverse thoughts and ideas into a cohesive whole. Just as a weaver creates intricate patterns from individual threads, our users create rich personal tapestries from individual quotes and collections. It speaks to the interconnectedness of wisdom and the beauty of bringing different perspectives together.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 text-center bg-muted/30 dark:bg-muted/20 animate-fadeInUp delay-600ms">
        <div className="container mx-auto px-4">
          <p className="text-lg text-muted-foreground mb-6">
            Thank you for being part of the QuoteWeave community.
          </p>
          <Button asChild variant="link" className="text-lg text-primary hover:text-primary/80">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}