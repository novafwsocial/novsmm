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
    id: "fallback-0",
    title: "Welcome Screen + OAuth Login Fixes",
    content: "Added a celebratory welcome overlay shown after successful login or registration. Two variants: 'Welcome to NOVSMM' with feature highlights for new users, and 'Welcome back' with auto-advance for returning users. Redesigned to match the landing page aesthetic (light theme, pill buttons, grid background, ghost wordmark). Fixed multiple OAuth login issues: NextAuth route handler corrected for App Router (was using Pages Router signature), IPv4 DNS forced for WSL2 compatibility (fixed ETIMEDOUT), auto-linking of OAuth accounts to existing email-registered users (fixed OAuthAccountNotLinked), PM2 ecosystem.config.js now loads .env explicitly via @next/env, and post-login redirect race condition resolved with 10s grace period.",
    category: "feature",
    createdAt: new Date().toISOString(),
  },
  {
    id: "fallback-1",
    title: "i18n Phase 2+3 — Full Landing Page Translation",
    content: "Complete internationalization of the entire landing page across 4 languages (English, Español, Português, Français). 250+ translation keys covering navbar, hero, services, marketplace, payments, security, pricing, testimonials, API docs, referral program, footer, and all CTAs. LanguageProvider with SSR-safe initialization, hreflang tags for SEO, language switcher in navbar. Every visible string on the landing page is now translatable.",
    category: "feature",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "fallback-2",
    title: "Comprehensive Audit Remediation — 130+ Issues Fixed",
    content: "Full-stack audit covering CI/CD, security, performance, and UX. Security: 2FA lockout bug fixed (encryption mismatch), mass assignment closed in admin routes (strict Zod schemas), API key IP allowlist bypass closed, CSP migrated to nonce-based (removed 'unsafe-inline'), roles permission enum validation, XSS in profile names sanitized, CSRF fail-closed. Performance: recharts replaced with SVG (-378KB), framer-motion deduplication (-804KB), admin endpoints paginated, refetchOnWindowFocus disabled (-40% requests), Google Fonts non-render-blocking, analytics queries parallelized (-60% latency). UX: pricing links added, fake social proof removed (FTC compliance), text legibility improved, PWA icon squared, testimonials pause-on-hover, logo redesigned. Infra: ecosystem.config.js fixed, CI/Docker migrated to bun.",
    category: "security",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "fallback-3",
    title: "Marketplace 18 Feature Improvements",
    content: "Complete marketplace overhaul: category filter (followers, likes, views), edit offer, history status filter, favorites/wishlist, history pagination, compare services (max 3 side-by-side), price range filter, trending services, star reviews/ratings, list/grid view toggle, CSV export, pause/activate offers, per-offer stats, bulk publish, suggested price calculator, sale notification toasts, search orders by ID, refund/cancel from history.",
    category: "feature",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "fallback-4",
    title: "Security Audit Remediation — R1 + R2 Complete",
    content: "Two rounds of independent security audit remediation. R1: JWT secret fail-closed (no more 'dev-secret-fallback'), image remotePatterns restricted (SSRF prevention), social proof labeled as 'Sample' (FTC compliance), package.json rebranded. R2: iOS zoom fix (inputs to 16px), privilege escalation guards (last-admin, self-demotion, security alerts on role changes), admin tabs mobile dropdown, overflow-x hidden safety net, requireAdmin() consistency.",
    category: "security",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "fallback-5",
    title: "Navigation Fix + Auth-Aware Navbar",
    content: "Logo in dashboard sidebar now navigates to the public landing page (preserving session) instead of the internal dashboard home. Navbar becomes auth-aware: shows user balance + 'Dashboard' button when logged in. Removed redundant 'Home' button from topbar (logo already does this). BackToDashboardButton moved to right side to avoid overlap with WhatsApp widget.",
    category: "improvement",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "fallback-6",
    title: "Payment Methods: 4 Final Methods",
    content: "Consolidated to 4 payment methods: PayPal, Mercado Pago, NowPayments (crypto), and Manual (WhatsApp/Zelle/Wire). Removed: Stripe (complete removal), Aurora Pay, DePay, Bank Transfer. PayPal webhook created with signature verification. Suggested price calculator added to publish offer modal.",
    category: "maintenance",
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "fallback-7",
    title: "3D + Motion Enhancement (Landing + Dashboard)",
    content: "Landing: 3D card tilt on hero dashboard, scroll reveals on service cards, floating chips, social proof notifications, sticky mobile CTA, shimmer effects. Dashboard: stat card hover lift, table row hover, modal 3D entrance, chart depth, button press feedback. Footer: link hover glow, column stagger reveal, logo float. Auth: 3D card entrance, input focus depth, social button hover. All GPU-composited, mobile-disabled, prefers-reduced-motion respected.",
    category: "feature",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "fallback-8",
    title: "API Docs + Changelog Pages + 404 Branded",
    content: "Created formatted HTML pages for /api-docs (was raw JSON), /changelog (was raw JSON), and custom 404 page. API docs: endpoint cards with method badges, code blocks, copy buttons, rate limits table, error codes. Changelog: timeline with category-coded dots (feature/improvement/bugfix/security/maintenance). 404: gradient floating '404', resource cards, CTAs.",
    category: "feature",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: "fallback-9",
    title: "SEO + Accessibility + Performance Suite",
    content: "SEO: sitemap.ts (11 URLs), robots.ts (AI-crawler opt-out), OG/Twitter images, JSON-LD (Organization, WebSite, WebApplication, Service, FAQPage, BreadcrumbList), metadataBase, title template, 14 keywords. A11y: skip-to-content link, main-content ID, ARIA labels. Performance: preconnect for fonts, Cloudflare HTML caching (TTFB 0ms), resource hints. Security: Permissions-Policy (30+ features), COOP/CORP, CSP extended.",
    category: "improvement",
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    id: "fallback-10",
    title: "OWASP Top 10 + ASVS Level 2 Audit",
    content: "OWASP: 27 findings resolved (3 P0, 9 P1, 10 P2, 5 P3). Key: wallet topup sandbox fallback removed (free money bug), Next.js 16.1.1→16.2.10 (17 CVEs), SSRF protection with DNS rebinding prevention. ASVS L2: 85% compliance (184 controls). Key: anti self-referral (IP+domain check), API key 90-day expiry, dynamic settings, license plan enum, social auth multi-provider.",
    category: "security",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "fallback-11",
    title: "Cloudflare Tunnel + SSL + CIS Hardening",
    content: "Production deployment via Cloudflare Tunnel. SSL automatic, HTML caching at edge (TTFB 0ms on cache HIT), DDoS protection, CDN. CIS Benchmarks: Docker (non-root, cap_drop ALL, read-only FS), Nginx (security headers, rate limiting, hidden files), PostgreSQL (scram-sha-256, logging), Linux (18 sysctl controls, SSH hardened). PM2 + cloudflared as systemd services with auto-start.",
    category: "security",
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
  },
  {
    id: "fallback-12",
    title: "Multi-Platform Service Catalog",
    content: "Service catalog expanded across 21 platforms including Telegram, Instagram, Facebook, YouTube, Spotify, X, TikTok, and more. Real-time provider sync with audit logging. Per-platform counts endpoint for accurate filter badges. All services auto-priced with consistent competitive markup.",
    category: "feature",
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
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
