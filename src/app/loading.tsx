/**
 * Global loading state — shown while Next.js loads route segments.
 *
 * UX FIX (U-M-003): was a centered spinner (Loader2) — perceived as
 * slow and jarring. Replaced with a skeleton that mimics the page
 * layout (navbar + hero + content blocks). Skeletons feel faster
 * because they show content structure, not just "waiting".
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Skeleton navbar */}
      <div className="flex h-16 items-center justify-between border-b border-border/40 px-4">
        <div className="h-7 w-32 animate-pulse rounded-full bg-muted" />
        <div className="hidden items-center gap-4 lg:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
      </div>

      {/* Skeleton hero */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
        <div className="mt-4 flex gap-3">
          <div className="h-11 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-11 w-28 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* Skeleton content blocks */}
      <div className="grid grid-cols-1 gap-4 px-4 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
          />
        ))}
      </div>
    </div>
  );
}
