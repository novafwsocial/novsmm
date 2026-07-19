"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage, type Language } from "./language-provider";
import { cn } from "@/lib/utils";

/**
 * Language switcher — compact dropdown for the navbar.
 * Shows the current language flag + code. Clicking opens a dropdown
 * with all 4 supported languages (EN, ES, PT, FR).
 *
 * Persists selection to localStorage via the LanguageProvider.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, supportedLangs, langLabels, langFlags } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-xs uppercase">{lang}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-border/60 bg-background p-1 nov-ring-lg"
          style={{ animation: "modal3dIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          {supportedLangs.map((l: Language) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                l === lang
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className="text-base">{langFlags[l]}</span>
              <span className="font-medium">{langLabels[l]}</span>
              {l === lang && (
                <span className="ml-auto text-xs text-primary">●</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
