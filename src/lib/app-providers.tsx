"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";

/**
 * App providers — TanStack Query + NextAuth SessionProvider.
 *
 * SessionProvider is needed for signIn/signOut to work correctly.
 * The CLIENT_FETCH_ERROR is suppressed by setting refetchOnWindowFocus=false
 * and refetchInterval=0 (we use our own useSession hook via TanStack Query).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 1000,
            // PERF FIX (P-H-001): refetchOnWindowFocus was `true`, which
            // caused a burst of 15-20 API requests every time the user
            // switched back to the NOVSMM tab. Most of our queries already
            // have their own refetchInterval (dashboard: 60s, orders: 60s,
            // notifications: via WS), so window-focus refetch is redundant
            // and wasteful. Set to false — queries still refetch on mount
            // and on their own intervals.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
