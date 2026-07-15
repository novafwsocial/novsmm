"use client";

import { useEffect } from "react";
import { useSession } from "@/hooks/use-api";

/**
 * HtmlLangSync
 *
 * Server-rendered HTML ships with `<html lang="en">` (English content). After
 * hydration, this client component reads the authenticated user's preferred
 * language from the session and updates `document.documentElement.lang` so
 * browsers, screen readers, and SEO crawlers see the correct language tag.
 *
 * No-op when the user is unauthenticated (defaults to "en").
 */
export function HtmlLangSync() {
  const { data: session } = useSession();
  const lang = (session?.user as any)?.language ?? "en";

  useEffect(() => {
    if (typeof document !== "undefined" && lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return null;
}
