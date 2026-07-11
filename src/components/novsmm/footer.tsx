"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Globe2 } from "lucide-react";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { Reveal } from "./reveal";
import { useApp, type DashboardTab } from "./app-store";
import { useToast } from "@/hooks/use-toast";
import { StatusPage } from "./status-page";
import { LegalPages, type LegalPageType } from "./legal-pages";

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
      { label: "Analytics", tab: "analytics" },
      { label: "API", externalUrl: "/api-docs" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Resellers", anchor: "#services" },
      { label: "Agencies", anchor: "#services" },
      { label: "Enterprises", anchor: "#services" },
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
  const [statusOpen, setStatusOpen] = useState(false);
  const [legalPageOpen, setLegalPageOpen] = useState<LegalPageType | null>(null);

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
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.label}
        </a>
      );
    }
    return (
      <button
        type="button"
        onClick={() => handleLink(link)}
        className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {link.label}
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
              Ship at the speed of attention.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Join 184,500+ resellers, agencies, and enterprises running their
              social media marketing on NOVSMM infrastructure.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic as="button" strength={0.3} onClick={() => setView("register")}>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Magnetic>
              <Magnetic as="button" strength={0.25} onClick={() => setView("login")}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  Sign in
                </span>
              </Magnetic>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              Available in 60+ countries · 12 currencies · 24/7 support
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
                className="inline-flex"
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
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                All systems operational
              </button>
            </div>

            {COLUMNS.map((c) => (
              <div key={c.title}>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {c.title}
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>{renderLink(l)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* bottom bar */}
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} NOVSMM, Inc.</span>
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
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                EN · USD
              </div>
              <span className="text-[11px] text-muted-foreground">
                SOC 2 · PCI DSS · GDPR
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
          className="text-center text-[clamp(4rem,18vw,16rem)] font-semibold leading-none tracking-[-0.04em] text-foreground/[0.03]"
        >
          NOVSMM
        </motion.div>
      </div>

      {statusOpen && <StatusPage onClose={() => setStatusOpen(false)} />}
      <LegalPages page={legalPageOpen} onClose={() => setLegalPageOpen(null)} />
    </footer>
  );
}
