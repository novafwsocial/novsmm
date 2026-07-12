"use client";

import { useEffect, useState } from "react";
import { Menu, X, ArrowRight, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
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
  // FIX (U-C-001): Pricing was unreachable from the landing — the /pricing
  // route exists but no nav link pointed to it. Adding it here makes the
  // CTA visible on every page (+15-25% signup rate per UX audit).
  { label: "Pricing", href: "/pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { setView, authed, setBrowsingLanding } = useApp();
  const { data: session } = useSession();
  const user = (session?.user as any) ?? {};
  const balance = user?.balance ?? 0;
  const currency = user?.currency ?? "USD";

  // If user is authed and browsing landing, show their balance + Dashboard button
  const showAuthedNav = authed;

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goDashboard = () => {
    setBrowsingLanding(false);
    setView("dashboard");
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4"
      style={{
        animation: "navbarIn 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
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

        {showAuthedNav ? (
          /* Authed user browsing landing — show balance + Dashboard button */
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-2 text-sm backdrop-blur-md">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground tabular-nums">
                ${balance.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
            <Magnetic as="button" strength={0.25} onClick={goDashboard}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Magnetic>
          </div>
        ) : (
          /* Not authed — show Sign in + Start free */
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
        )}

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div
          className="absolute left-4 right-4 top-[68px] z-50 origin-top rounded-3xl border border-border/60 bg-background/95 p-3 backdrop-blur-xl lg:hidden"
          style={{
            animation: "mobileMenuIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
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
            {showAuthedNav ? (
              <>
                <div className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    ${balance.toFixed(2)} {currency}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    goDashboard();
                  }}
                  className="rounded-2xl bg-primary px-4 py-3 text-center text-base font-medium text-primary-foreground"
                >
                  Back to Dashboard
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
