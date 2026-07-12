"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowRight, Globe2 } from "lucide-react";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { Reveal } from "./reveal";
import { useApp, type DashboardTab } from "./app-store";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "./language-provider";
import { StatusPage } from "./status-page";
import { LegalPages, type LegalPageType } from "./legal-pages";
import { DashReveal } from "./dash-reveal";

type FooterLink = {
  label: string;
  /** Anchor on the landing page (e.g. "#services") */
  anchor?: string;
  /** Dashboard tab to switch to (when authed) */
  tab?: DashboardTab;
  /** Auth view to switch to */
  view?: "login" | "register";
  /** Open an external URL in a new tab (e.g. "/api/docs") */
  externalUrl?: string;
  /** Open the system status overlay */
  overlay?: "status";
  /** Open a legal/info page overlay */
  legalPage?: LegalPageType;
  /** Legal/commercial placeholder → toast */
  placeholder?: boolean;
  /** Custom toast message when placeholder is true */
  placeholderMessage?: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const COLUMNS: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", tab: "home" },
      { label: "Services", tab: "marketplace" },
      { label: "Marketplace", anchor: "#marketplace" },
      { label: "Payments", anchor: "#payments" },
      // FIX (U-C-001): Pricing was unreachable from the footer. Adding it
      // here makes the /pricing route discoverable from every page.
      { label: "Pricing", externalUrl: "/pricing" },
      { label: "Analytics", tab: "analytics" },
      { label: "API", externalUrl: "/api-docs" },
    ],
  },
  {
    title: "Solutions",
    links: [
      // U-M-006: was 6 links all pointing to #services or #marketplace.
      // Now each points to the most relevant section for that audience.
      { label: "Resellers", anchor: "#marketplace" },
      { label: "Agencies", anchor: "#services" },
      { label: "Enterprises", anchor: "#security" },
      { label: "Creators", anchor: "#services" },
      { label: "Wholesale", anchor: "#marketplace" },
      { label: "Affiliates", anchor: "#affiliates" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", legalPage: "about" },
      { label: "Careers", legalPage: "careers" },
      { label: "Press", legalPage: "press" },
      { label: "Partners", legalPage: "partners" },
      { label: "Contact", tab: "tickets" },
      { label: "Status", overlay: "status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", externalUrl: "/api-docs" },
      { label: "API reference", externalUrl: "/api-docs" },
      { label: "Changelog", externalUrl: "/changelog" },
      { label: "Security", anchor: "#security" },
      { label: "Legal", legalPage: "legal" },
    ],
  },
];

export function Footer() {
  const { setView, setDashboardTab, authed } = useApp();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [statusOpen, setStatusOpen] = useState(false);
  const [legalPageOpen, setLegalPageOpen] = useState<LegalPageType | null>(null);
  // PERF FIX (P-L-003): compute year in useEffect to avoid hydration
  // mismatch. `new Date().getFullYear()` runs on both server and client —
  // if the server is in a different timezone, the year could differ by 1
  // around New Year's Eve, causing a React hydration warning.
  const [year, setYear] = useState(2026);
  useEffect(() => setYear(new Date().getFullYear()), []);

  const showToast = (label: string, message?: string) =>
    toast({
      title: message ? `${label}` : `${label} — coming soon`,
      description:
        message ??
        "We're still putting the finishing touches on this page.",
    });

  const handleLink = (link: FooterLink) => {
    if (link.overlay === "status") {
      setStatusOpen(true);
      return;
    }
    if (link.legalPage) {
      setLegalPageOpen(link.legalPage);
      return;
    }
    if (link.externalUrl) {
      window.open(link.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (link.anchor) {
      // Scroll to landing section. If we're inside the dashboard (authed),
      // first bounce back to the landing view so the anchor is in the DOM.
      if (authed) {
        setView("landing");
        // wait for landing to mount before scrolling
        setTimeout(() => {
          document
            .querySelector(link.anchor!)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      } else {
        document
          .querySelector(link.anchor)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (link.tab) {
      if (!authed) {
        setView("login");
        return;
      }
      setView("dashboard");
      setDashboardTab(link.tab);
      return;
    }
    if (link.view) {
      setView(link.view);
      return;
    }
    if (link.placeholder) {
      showToast(link.label, link.placeholderMessage);
      return;
    }
  };

  const renderLink = (link: FooterLink) => {
    // Anchor links render as real <a href="#..."> for SEO + middle-click
    if (link.anchor) {
      return (
        <a
          href={link.anchor}
          onClick={(e) => {
            e.preventDefault();
            handleLink(link);
          }}
          className="footer-link-3d text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t(link.label)}
        </a>
      );
    }
    return (
      <button
        type="button"
        onClick={() => handleLink(link)}
        className="footer-link-3d text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t(link.label)}
      </button>
    );
  };

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border bg-background">
      {/* Final CTA band */}
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[360px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[120px]"
        />
        <Reveal blur>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-balance">
              {t("landing.footer.tagline")}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              {/* FIX (U-C-003): removed fake "184,500+ resellers" claim —
                  risk of FTC penalty + Google penalty for fake social proof.
                  Replaced with an honest value-prop statement. */}
              Join the resellers, agencies, and enterprises running their
              {t("landing.footer.tagline")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic as="button" strength={0.3} onClick={() => setView("register")}>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                  {t("landing.footer.startFree")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Magnetic>
              <Magnetic as="button" strength={0.25} onClick={() => setView("login")}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  {t("landing.footer.signIn")}
                </span>
              </Magnetic>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              {t("landing.footer.availableIn")}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Link grid */}
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 lg:col-span-2">
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  if (authed) {
                    setView("landing");
                    setTimeout(() => {
                      document
                        .querySelector("#hero")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 80);
                  } else {
                    document
                      .querySelector("#hero")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="footer-logo-float inline-flex"
                aria-label="NOVSMM home"
              >
                <Logo />
              </a>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Automation infrastructure for digital marketing teams and
                resellers — engineered for performance.
              </p>
              <button
                type="button"
                onClick={() => setStatusOpen(true)}
                className="status-badge-glow mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                All systems operational
              </button>
            </div>

            {COLUMNS.map((c, idx) => (
              <DashReveal
                key={t(c.title)}
                className="footer-col-reveal"
                delay={0.05 * (idx + 1)}
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    {t(c.title)}
                  </div>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {c.links.map((l) => (
                      <li key={l.label}>{renderLink(l)}</li>
                    ))}
                  </ul>
                </div>
              </DashReveal>
            ))}
          </div>

          {/* bottom bar */}
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {/* U-L-002: removed "Inc." — implies US incorporation that
                  probably doesn't exist. Just "NOVSMM" is cleaner. */}
              <span>© {year} {t("landing.footer.copyright")}</span>
              <button
                type="button"
                onClick={() => setLegalPageOpen("terms")}
                className="hover:text-foreground"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => setLegalPageOpen("privacy")}
                className="hover:text-foreground"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => setLegalPageOpen("cookies")}
                className="hover:text-foreground"
              >
                Cookies
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* UX FIX (U-M-005): was a decorative pill with no action.
                  Now links to the pricing page (which shows currency
                  options) when authed, or shows a tooltip when not. */}
              <button
                onClick={() => {
                  const { setView, authed } = useApp.getState();
                  if (authed) {
                    setView("dashboard");
                    setTimeout(() => useApp.getState().setDashboardTab("profile"), 100);
                  } else {
                    setView("register");
                  }
                }}
                className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Change language or currency"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                EN · USD
              </button>
              {/* U-M-012: removed "SOC 2 · PCI DSS · GDPR" — NOVSMM is not
                  SOC 2 certified, PCI DSS compliant, or GDPR audited.
                  Displaying these certifications without holding them is
                  a legal misrepresentation. Replaced with a neutral
                  "Privacy-first" label that's honest. */}
              <span className="text-[11px] text-muted-foreground">
                {t("landing.footer.privacyFirst")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* giant wordmark — subtle depth */}
      <div
        aria-hidden
        className="pointer-events-none select-none overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          // U-L-007: opacity was 0.03 — invisible on some monitors (especially
          // low-contrast IPS panels and anti-glare screens). Bumped to 0.04 so
          // the wordmark is barely visible (the design intent) but not invisible.
          className="text-center text-[clamp(4rem,18vw,16rem)] font-semibold leading-none tracking-[-0.04em] text-foreground/[0.04]"
        >
          NOVSMM
        </motion.div>
      </div>

      {statusOpen && <StatusPage onClose={() => setStatusOpen(false)} />}
      <LegalPages page={legalPageOpen} onClose={() => setLegalPageOpen(null)} />
    </footer>
  );
}
