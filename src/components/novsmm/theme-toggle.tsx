"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Dark mode toggle — lightweight, no dependencies.
 * Persists to localStorage, applies .dark class on <html>.
 * Migrated from framer-motion to CSS animation (fm-scale-in).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("novsmm-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("novsmm-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => setIsDark((v) => !v);

  return (
    <button
      onClick={toggle}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className ?? ""}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span
        key={isDark ? "moon" : "sun"}
        className="fm-scale-in"
        style={{ animationDuration: "0.2s" }}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
