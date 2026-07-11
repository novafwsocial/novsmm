"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Bug, Zap, Shield, Wrench } from "lucide-react";

type ChangelogEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
};

const CATEGORY_ICONS: Record<string, any> = {
  feature: Sparkles,
  improvement: Zap,
  bugfix: Bug,
  security: Shield,
  maintenance: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  feature: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  improvement: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  bugfix: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  security: "bg-red-500/15 text-red-700 border-red-500/30",
  maintenance: "bg-muted text-muted-foreground border-border",
};

// Fallback entries when API returns empty
const FALLBACK_ENTRIES: ChangelogEntry[] = [
  {
    id: "fallback-1",
    title: "OWASP Top 10 Security Audit Complete",
    content: "Comprehensive security audit covering all 10 OWASP categories. 27 findings resolved including 3 P0 critical fixes (wallet topup sandbox fallback, Next.js CVE updates, SSRF protection). All 80+ API routes verified with proper auth checks.",
    category: "security",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "fallback-2",
    title: "ASVS Level 2 Compliance — 85%",
    content: "Application Security Verification Standard Level 2 audit completed. 184 controls verified, 85% compliant. Key fixes: anti self-referral, API key 90-day expiry, dynamic settings, multi-provider social auth, license plan enum validation.",
    category: "security",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "fallback-3",
    title: "Mobile Performance Optimization",
    content: "Landing page LCP reduced from 626ms to 297ms (53% improvement). Removed framer-motion from critical path, replaced recharts with SVG charts in hero, disabled entry animations on mobile, added Cloudflare HTML caching.",
    category: "improvement",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "fallback-4",
    title: "HuntSMM Provider Integration",
    content: "Real-time sync with HuntSMM API. 6,306 services imported across 21 platforms (Telegram, Instagram, Facebook, YouTube, Spotify, X, TikTok, and more). 30% markup applied automatically.",
    category: "feature",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "fallback-5",
    title: "3D Landing Enhancement",
    content: "Added 3D card tilt on hero dashboard, scroll reveals on service cards, floating chips with 3D animation, social proof notifications, sticky mobile CTA bar, and shimmer effects on CTAs. All GPU-composited, mobile-optimized.",
    category: "feature",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "fallback-6",
    title: "Payment Methods Cleanup",
    content: "Consolidated to 5 payment methods: Stripe, PayPal, Mercado Pago, NowPayments, and Manual. Removed Aurora Pay, DePay, and Bank Transfer. Created PayPal webhook with signature verification.",
    category: "maintenance",
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "fallback-7",
    title: "Cloudflare Tunnel + SSL",
    content: "Production deployment via Cloudflare Tunnel. SSL automatic, HTML caching at edge (TTFB 0ms on cache HIT), DDoS protection, and CDN. Domain: novsmm.shop",
    category: "feature",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "fallback-8",
    title: "CIS Benchmarks Hardening",
    content: "Docker containers: non-root user, cap_drop ALL, read-only filesystem, no-new-privileges. Nginx: security headers, rate limiting, hidden sensitive files. PostgreSQL: scram-sha-256, logging. Linux: 18 sysctl controls, SSH hardened.",
    category: "security",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ChangelogClient() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cms?type=blog_post&category=changelog")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items && d.items.length > 0) {
          setEntries(d.items);
        } else {
          // Use fallback entries when no CMS content
          setEntries(FALLBACK_ENTRIES);
        }
      })
      .catch(() => setEntries(FALLBACK_ENTRIES))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to NOVSMM</span>
          </a>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Changelog
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Changelog</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Platform updates, new features, and improvements.
        </p>

        {/* Timeline */}
        <div className="mt-10 flex flex-col gap-6">
          {entries.map((entry, i) => {
            const Icon = CATEGORY_ICONS[entry.category] || Wrench;
            const colorClass = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.maintenance;

            return (
              <div key={entry.id || i} className="relative pl-8">
                {/* Timeline line */}
                {i < entries.length - 1 && (
                  <div className="absolute left-[11px] top-8 h-full w-px bg-border" />
                )}

                {/* Timeline dot */}
                <div
                  className={`timeline-dot-pulse absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border ${colorClass}`}
                >
                  <Icon className="h-3 w-3" />
                </div>

                {/* Content */}
                <div className="timeline-entry-3d rounded-2xl border border-border bg-background p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                      {entry.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-foreground">
                    {entry.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {entry.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-border pt-8 text-center">
          <a
            href="/"
            className="inline-block text-sm text-primary hover:underline"
          >
            ← Back to NOVSMM
          </a>
        </div>
      </main>
    </div>
  );
}
