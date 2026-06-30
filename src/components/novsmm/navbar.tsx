"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { useApp } from "./app-store";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Platform", href: "#hero" },
  { label: "Services", href: "#services" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Payments", href: "#payments" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#plans" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { setView } = useApp();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4"
    >
      <nav
        className={cn(
          "flex w-full max-w-6xl items-center justify-between rounded-full px-3 py-2 transition-all duration-500 sm:px-4",
          scrolled
            ? "nov-glass nov-ring border border-border/40"
            : "border border-transparent bg-transparent"
        )}
      >
        <a href="#hero" className="flex items-center" aria-label="NOVSMM home">
          <Logo />
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            onClick={() => setView("login")}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </button>
          <Magnetic as="button" strength={0.25} onClick={() => setView("register")}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Magnetic>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="absolute left-4 right-4 top-[68px] z-50 origin-top rounded-3xl border border-border/60 bg-background/95 p-3 backdrop-blur-xl lg:hidden"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <button
                onClick={() => {
                  setOpen(false);
                  setView("login");
                }}
                className="rounded-2xl px-4 py-3 text-left text-base font-medium text-foreground/80"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setView("register");
                }}
                className="rounded-2xl bg-primary px-4 py-3 text-center text-base font-medium text-primary-foreground"
              >
                Start free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
