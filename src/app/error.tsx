"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Global Next.js App Router error page.
 * Catches unhandled errors at the route level.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md rounded-3xl border border-border/60 bg-background p-8 text-center nov-ring-lg"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {error?.message && (
              <pre className="mt-4 max-h-24 overflow-auto rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground nov-scroll">
                {error.message}
              </pre>
            )}
            <button
              onClick={reset}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
