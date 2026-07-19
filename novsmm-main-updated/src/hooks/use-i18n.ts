"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "@/hooks/use-api";
import {
  getTranslations,
  type TranslationKey,
} from "@/lib/i18n";

/**
 * useTranslation — client-side i18n hook for the NOVSMM dashboard.
 *
 * Language resolution order:
 *   1. The logged-in user's `language` field (from the NextAuth session).
 *   2. The browser's `navigator.language` (normalised to a supported code).
 *   3. English ("en") as the universal fallback.
 *
 * Returns:
 *   - `t(key, fb)` — translation function; falls back to `fb` then to the key
 *   - `tRaw(key)`  — returns the raw translation string (no fallback) — useful
 *                    when you need to know whether a key was actually translated
 *   - `translations` — the full resolved translation dictionary for the lang
 *
 * The hook depends on TanStack Query's `useSession`, which caches the session
 * for 30s and re-fetches on focus. Switching language in the profile panel
 * updates the session via PATCH /api/me/language, so the next render reflects
 * the new language automatically.
 */
export function useTranslation() {
  const { data: session } = useSession();

  const lang = useMemo(() => {
    const userLang = (session as any)?.user?.language as string | undefined;
    if (userLang) return userLang.toLowerCase().slice(0, 2);
    if (typeof navigator !== "undefined" && navigator.language) {
      return navigator.language.toLowerCase().slice(0, 2);
    }
    return "en";
  }, [session]);

  const translations = useMemo(() => getTranslations(lang), [lang]);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      return translations[key] ?? fallback ?? key;
    },
    [translations]
  );

  const tRaw = useCallback(
    (key: TranslationKey): string | undefined => {
      return translations[key];
    },
    [translations]
  );

  return { lang, t, tRaw, translations };
}
