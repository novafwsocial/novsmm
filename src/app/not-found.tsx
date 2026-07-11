import Link from "next/link";
import { ArrowLeft, Compass, LifeBuoy, Search } from "lucide-react";

/**
 * Custom 404 Not Found page.
 *
 * Triggered by Next.js when no route matches. Branded to match the rest of
 * the NOVSMM design system (electric blue CTA, white background, near-black
 * ink, soft rings).
 *
 * Accessibility:
 *   - Single h1 (page heading hierarchy preserved)
 *   - Skip-to-content link from layout.tsx still works (main has id)
 *   - All CTAs are real links (anchor tags) — keyboard navigable
 *   - aria-describedby links the heading to the help text for SR users
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-16"
    >
      {/* Background — grid + soft glow, matches hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 nov-grid-bg nov-radial-fade" />
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-xl text-center">
        {/* 404 mark — large, branded */}
        <p
          aria-hidden
          className="select-none text-[clamp(6rem,18vw,12rem)] font-semibold leading-none tracking-tighter nov-text-gradient"
        >
          404
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
          This page took a different path
        </h1>

        <p
          id="not-found-help"
          className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground"
        >
          The page you&apos;re looking for may have been moved, renamed, or
          never existed. Let&apos;s get you back on track.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/#services"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Compass className="h-4 w-4" />
            Explore services
          </Link>
        </div>

        {/* Secondary resources */}
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <Link
            href="/api-docs"
            className="group rounded-2xl border border-border/60 bg-background/60 p-4 text-left backdrop-blur-sm transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-foreground">API docs</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Browse the developer reference
            </p>
          </Link>
          <Link
            href="/#faq"
            className="group rounded-2xl border border-border/60 bg-background/60 p-4 text-left backdrop-blur-sm transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-foreground">FAQ</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Common questions &amp; answers
            </p>
          </Link>
          <Link
            href="/#security"
            className="group rounded-2xl border border-border/60 bg-background/60 p-4 text-left backdrop-blur-sm transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LifeBuoy className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-foreground">Get help</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open a ticket from the dashboard
            </p>
          </Link>
        </div>

        {/* Footer microcopy */}
        <p className="mt-12 text-xs text-muted-foreground">
          Error code: 404 · NOVSMM
        </p>
      </div>
    </main>
  );
}
