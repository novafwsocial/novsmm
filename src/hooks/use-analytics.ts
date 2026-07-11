/**
 * Analytics hook — placeholder for future analytics integration.
 * Supports Google Analytics, PostHog, or any event-based analytics.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track("sign_up", { method: "google" });
 *
 * To activate: set NEXT_PUBLIC_GA_ID in .env and uncomment the gtag call.
 */

export function useAnalytics() {
  const track = (event: string, data?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    if (process.env.NEXT_PUBLIC_GA_ID) {
      // gtag("event", event, data);
    }
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // posthog.capture(event, data);
    }
  };
  return { track };
}
