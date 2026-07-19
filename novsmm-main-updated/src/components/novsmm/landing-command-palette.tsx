"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ArrowRight, X } from "lucide-react";

/**
 * Landing command palette — ⌘K / Ctrl+K quick navigation.
 *
 * UX FIX (U-M-004): the command palette was only available in the
 * dashboard. Landing page visitors had no quick way to jump to
 * sections. This lightweight palette lets them search and jump to
 * any landing section or public page.
 */

const COMMANDS = [
  { label: "Platform / Hero", href: "#hero", section: "Landing" },
  { label: "Services", href: "#services", section: "Landing" },
  { label: "Marketplace", href: "#marketplace", section: "Landing" },
  { label: "Payments", href: "#payments", section: "Landing" },
  { label: "Stats", href: "#stats", section: "Landing" },
  { label: "Testimonials", href: "#testimonials", section: "Landing" },
  { label: "Security", href: "#security", section: "Landing" },
  { label: "API Docs", href: "#api-docs", section: "Landing" },
  { label: "Affiliates", href: "#affiliates", section: "Landing" },
  { label: "FAQ", href: "#faq", section: "Landing" },
  // MOB-1c-012 FIX: removed "Pricing" entry — /pricing route was deleted.
  { label: "Changelog", href: "/changelog", section: "Pages" },
  { label: "API Reference", href: "/api-docs", section: "Pages" },
];

export function LandingCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const navigate = (href: string) => {
    setOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].href);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-foreground/40 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-background nov-ring-lg"
        style={{ animation: "modal3dIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections and pages…"
            className="w-full bg-transparent text-sm text-foreground focus:outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto nov-scroll p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.href}
                onClick={() => navigate(cmd.href)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {cmd.section}
                  </span>
                  {cmd.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ Navigate · Enter Select · Esc Close</span>
          <span>NOVSMM</span>
        </div>
      </div>
    </div>
  );
}
