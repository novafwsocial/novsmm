"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/novsmm/logo";
import { Magnetic } from "@/components/novsmm/magnetic";
import { useApp } from "@/components/novsmm/app-store";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/novsmm/language-provider";
import { LanguageSwitcher } from "@/components/novsmm/language-switcher";
import { scrollToAnchorWhenReady } from "@/components/novsmm/scroll-utils";

// A2-M-004 FIX: removed the top-level static NAV_LINKS — the dynamic
// one inside Navbar() (with i18n translations) is the single source.
// Keeping the static one caused confusion and dual maintenance.

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { setView, authed, setBrowsingLanding } = useApp();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const user = (session?.user as any) ?? {};
  const balance = user?.balance ?? 0;
  const currency = user?.currency ?? "USD";

  // i18n (U-C-004): nav links now use translation keys
  const NAV_LINKS = [
    { label: t("landing.nav.platform"), href: "#hero" },
    { label: t("landing.nav.services"), href: "#services" },
    { label: t("landing.nav.marketplace"), href: "#marketplace" },
    { label: t("landing.nav.payments"), href: "#payments" },
    { label: t("landing.nav.security"), href: "#security" },
    { label: "Blog", href: "/blog" },
  ];

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

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const mobileMenu =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[110] bg-foreground/35 backdrop-blur-[4px] lg:hidden"
            />
            <div
              id="mobile-navigation-menu"
              className="fixed inset-x-3 top-[4.35rem] z-[120] max-h-[calc(100dvh-4.85rem)] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-border/70 bg-background/98 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.18)] ring-1 ring-border/40 backdrop-blur-xl lg:hidden"
              style={{
                animation: "mobileMenuIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              // A2-M-003 FIX: add dialog semantics for screen readers
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="mb-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  NOVSMM
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  Navega rápido por la plataforma
                </p>
              </div>

              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => {
                      if (!l.href.startsWith("#")) return;
                      e.preventDefault();
                      setOpen(false);
                      scrollToAnchorWhenReady(l.href);
                    }}
                    className="block rounded-2xl px-4 py-3.5 text-base font-medium text-foreground/85 transition-colors hover:bg-muted"
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              {/* F-003 FIX: Language selector visible on mobile. Previously the
                  LanguageSwitcher was only in the `hidden lg:flex` desktop block,
                  so mobile users (core LATAM/Brazil market) couldn't change language. */}
              <div className="mt-3 flex items-center justify-between rounded-2xl border-t border-border/60 px-4 py-4">
                <span className="text-sm text-muted-foreground">Language</span>
                <LanguageSwitcher />
              </div>

              <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3">
                {showAuthedNav ? (
                  <>
                    <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm">
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
                      className="rounded-2xl bg-foreground px-4 py-3 text-center text-base font-medium text-background"
                    >
                      {t("landing.nav.dashboard")}
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
                      {t("landing.nav.signIn")}
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        setView("register");
                      }}
                      className="rounded-2xl bg-foreground px-4 py-3 text-center text-base font-medium text-background"
                    >
                      {t("landing.nav.startFree")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <header
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-3 sm:pt-4"
      style={{
        animation: "navbarIn 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <nav
        className={cn(
          "flex w-full max-w-6xl items-center justify-between rounded-full px-3 py-2 transition-all duration-500 sm:px-4",
          scrolled
            ? "bg-background border border-border"
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
              onClick={(e) => {
                if (!l.href.startsWith("#")) return;
                e.preventDefault();
                setOpen(false);
                scrollToAnchorWhenReady(l.href);
              }}
              className="relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        {showAuthedNav ? (
          /* Authed user browsing landing — show balance + Dashboard button */
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-sm">
              <Wallet className="h-3.5 w-3.5 text-foreground" />
              <span className="font-medium text-foreground tabular-nums">
                ${balance.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
            <Magnetic as="button" strength={0.25} onClick={goDashboard}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-muted hover:text-foreground border border-foreground">
                {t("landing.nav.dashboard")}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Magnetic>
          </div>
        ) : (
          /* Not authed — show Language switcher + Sign in + Start free */
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <button
              onClick={() => setView("login")}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.signIn")}
            </button>
            <Magnetic as="button" strength={0.25} onClick={() => setView("register")}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-muted hover:text-foreground border border-foreground">
                {t("landing.nav.startFree")}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Magnetic>
          </div>
        )}

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-navigation-menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileMenu}
    </header>
  );
}
