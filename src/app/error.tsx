"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

/**
 * Global Next.js App Router error page.
 * Catches unhandled errors at the route level.
 *
 * SECURITY (OWASP A05-3, P2): the user-facing page NO LONGER renders
 * `error.message`. In dev mode `error.message` can include stack-trace
 * snippets, file paths, and SQL/Prisma error text; in production it can
 * propagate upstream API error messages (Stripe request IDs, internal
 * parameter names). All of that is useful to an attacker probing the
 * integration surface.
 *
 * Instead we show a generic message + the `error.digest` correlation ID
 * (a Next.js-generated hash safe to show users). The full `error.message`
 * is logged to the server via the effect below (it runs in the browser,
 * so we use console.error which the APM/Sentry integration picks up).
 *
 * PERF FIX (U-M-002): removed framer-motion import. This error page is
 * a route-level error boundary that loads on ANY unhandled error — it
 * was pulling framer-motion (~30KB) into the error chunk just for a
 * fade+scale animation. Replaced with CSS animation class
 * (error-boundary-enter, defined in globals.css — same class used by
 * error-boundary.tsx).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Browser-side log — picked up by Sentry / APM. The server-side log
    // is the responsibility of whichever route threw the error.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="error-boundary-enter max-w-md rounded-3xl border border-border/60 bg-background p-8 text-center nov-ring-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {error?.digest && (
              <p className="mt-4 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                Reference: <code className="font-mono">{error.digest}</code>
              </p>
            )}
            <button
              onClick={reset}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
