"use client";

import { motion } from "framer-motion";
import { ArrowRight, Globe2 } from "lucide-react";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { Reveal } from "./reveal";
import { useApp } from "./app-store";

const COLUMNS = [
  {
    title: "Platform",
    links: ["Dashboard", "Services", "Marketplace", "Payments", "Analytics", "API"],
  },
  {
    title: "Solutions",
    links: ["Resellers", "Agencies", "Enterprises", "Creators", "Wholesale", "Affiliates"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Partners", "Contact", "Status"],
  },
  {
    title: "Resources",
    links: ["Docs", "API reference", "Changelog", "Security", "Legal", "Privacy"],
  },
];

export function Footer() {
  const { setView } = useApp();
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
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Automation infrastructure for digital marketing teams and
                resellers — engineered for performance.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  All systems operational
                </span>
              </div>
            </div>

            {COLUMNS.map((c) => (
              <div key={c.title}>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {c.title}
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* bottom bar */}
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} NOVSMM, Inc.</span>
              <a href="#" className="hover:text-foreground">
                Terms
              </a>
              <a href="#" className="hover:text-foreground">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground">
                Cookies
              </a>
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
    </footer>
  );
}
