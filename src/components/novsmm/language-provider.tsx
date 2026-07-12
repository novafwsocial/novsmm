"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getTranslations, type TranslationKey } from "@/lib/i18n";

/**
 * NOVSMM Language Provider — client-side i18n for the landing page.
 *
 * Stores the selected language in localStorage (key: "novsmm-lang").
 * Falls back to browser language detection, then to "en".
 *
 * Usage:
 *   // In layout or page:
 *   <LanguageProvider>
 *     <Navbar />
 *     <Hero />
 *   </LanguageProvider>
 *
 *   // In any child component:
 *   const { t, lang, setLang } = useLanguage();
 *   <h1>{t("landing.hero.title")}</h1>
 */

export type Language = "en" | "es" | "pt" | "fr";

const SUPPORTED_LANGS: Language[] = ["en", "es", "pt", "fr"];

const LANG_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
};

const LANG_FLAGS: Record<Language, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  pt: "🇧🇷",
  fr: "🇫🇷",
};

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  supportedLangs: Language[];
  langLabels: Record<Language, string>;
  langFlags: Record<Language, string>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "novsmm-lang";

function detectBrowserLang(): Language {
  if (typeof window === "undefined") return "en";
  const browser = navigator.language.split("-")[0].toLowerCase();
  if (SUPPORTED_LANGS.includes(browser as Language)) return browser as Language;
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Load language on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    const initial = stored && SUPPORTED_LANGS.includes(stored) ? stored : detectBrowserLang();
    setLangState(initial);
  }, []);

  // Update translations when lang changes
  useEffect(() => {
    const t = getTranslations(lang);
    setTranslations(t as any);
    // Update <html lang="...">
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[key] ?? fallback ?? key;
  };

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t, supportedLangs: SUPPORTED_LANGS, langLabels: LANG_LABELS, langFlags: LANG_FLAGS }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if used outside provider — return English with no-op setter
    return {
      lang: "en" as Language,
      setLang: () => {},
      t: (key: string, fallback?: string) => fallback ?? key,
      supportedLangs: SUPPORTED_LANGS,
      langLabels: LANG_LABELS,
      langFlags: LANG_FLAGS,
    };
  }
  return ctx;
}
