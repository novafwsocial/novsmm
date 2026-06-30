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
            refetchOnWindowFocus: true,
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
