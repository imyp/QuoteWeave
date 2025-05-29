import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Feather, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30 pt-16 pb-24 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-40 dark:opacity-30"
             style={{ backgroundImage: "url('/hero-light-pattern.svg')" }}></div>
        <div className="absolute inset-0 opacity-0 dark:opacity-30"
             style={{ backgroundImage: "url('/hero-dark-pattern.svg')" }}></div>

        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl animate-fadeInUp">
            <span className="block text-primary pb-2">
              QuoteWeave
            </span>
            <span className="block text-2xl sm:text-3xl md:text-4xl text-muted-foreground mt-2 font-normal tracking-normal animate-fadeInUp delay-200ms">
              Your Personal Tapestry of Wisdom
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl md:max-w-2xl mx-auto my-8 sm:text-xl md:text-2xl animate-fadeInUp delay-400ms">
            Discover, create, and share profound quotes that resonate. Weave together ideas, inspiration, and insights in one beautiful place.
          </p>
          <div className="flex flex-col items-center sm:flex-row sm:justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fadeInUp delay-600ms">
            <Button
              asChild
              size="lg"
              className="font-semibold text-lg text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto px-10 py-6 sm:text-xl sm:px-12 sm:py-7"
              style={{ backgroundImage: 'var(--gradient-signup-button)' }}
            >
              <Link href="/signup">Start Weaving - It&apos;s Free</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              size="lg"
              className="font-semibold text-lg border-2 border-border hover:border-primary hover:text-primary transition-colors w-full sm:w-auto px-10 py-6 sm:text-xl sm:px-12 sm:py-7"
            >
              <Link href="/quotes">Explore Quotes</Link>
            </Button>
          </div>
          <p className="mt-12 text-sm text-muted-foreground animate-fadeInUp delay-800ms">
            Already a weaver? <Link href="/login" className="font-semibold text-primary hover:text-primary/80 hover:underline">Log In</Link>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30 dark:bg-muted/20 overflow-hidden">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 animate-fadeInUp">
            Why You&apos;ll Love QuoteWeave
          </h2>
          <p className="text-muted-foreground mb-12 text-lg max-w-2xl mx-auto animate-fadeInUp delay-200ms">
            QuoteWeave offers a seamless experience for quote enthusiasts and creators alike.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-8 bg-card/80 dark:bg-card/70 rounded-xl shadow-lg backdrop-blur-sm hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.03] animate-fadeInUp delay-400ms">
              <Feather size={48} className="text-primary mb-6 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Create & Curate</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Easily add your own quotes, tag them, and organize them into personal collections. Your thoughts, beautifully preserved.
              </p>
            </div>
            <div className="flex flex-col items-center p-8 bg-card/80 dark:bg-card/70 rounded-xl shadow-lg backdrop-blur-sm hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.03] animate-fadeInUp delay-600ms">
              <BookOpen size={48} className="text-primary mb-6 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Discover Wisdom</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Explore a vast library of quotes from renowned authors and thinkers. Find inspiration for every mood and occasion.
              </p>
            </div>
            <div className="flex flex-col items-center p-8 bg-card/80 dark:bg-card/70 rounded-xl shadow-lg backdrop-blur-sm hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.03] animate-fadeInUp delay-800ms">
              <Users size={48} className="text-primary mb-6 transition-transform duration-300 group-hover:scale-110" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Share & Connect</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Share your favorite quotes and collections with friends or the community. (Community features coming soon!)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action / Footer Placeholder */}
      <section className="py-20 px-4 text-center bg-gradient-to-t from-background to-muted/50 dark:from-background dark:to-muted/30 overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8 animate-fadeInUp">
            Ready to Weave Your Wisdom?
          </h2>
          <Button
            asChild
            size="lg"
            className="font-semibold text-lg text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 px-10 py-6 sm:text-xl sm:px-12 sm:py-7 animate-fadeInUp delay-200ms"
            style={{ backgroundImage: 'var(--gradient-signup-button)' }}
            >
            <Link href="/signup">Join QuoteWeave Today</Link>
          </Button>
          <footer className="mt-16 animate-fadeInUp delay-400ms">
            <nav className="flex justify-center space-x-4 mb-4 text-sm text-muted-foreground">
                <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </nav>
            <p className="text-xs text-muted-foreground">
                QuoteWeave &copy; {new Date().getFullYear()} - Weave Your Wisdom
            </p>
        </footer>
      </section>
    </>
  );
}
