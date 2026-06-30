"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * App providers — TanStack Query only.
 *
 * NextAuth's SessionProvider is removed because it auto-fetches /api/auth/session
 * and throws CLIENT_FETCH_ERROR when behind a reverse proxy (Caddy gateway).
 * Instead, we use our custom useSession() hook (in use-api.ts) that fetches
 * the session via TanStack Query with proper error handling.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
