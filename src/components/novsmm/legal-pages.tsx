"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "./logo";

/**
 * LegalPages — full-screen overlay that displays legal/info pages.
 * Triggered from the footer when a placeholder link is clicked.
 *
 * Pages: About, Careers, Press, Partners, Legal, Privacy, Terms, Cookies
 */

export type LegalPageType =
  | "about"
  | "careers"
  | "press"
  | "partners"
  | "legal"
  | "privacy"
  | "terms"
  | "cookies";

const PAGES: Record<LegalPageType, { title: string; subtitle: string; content: React.ReactNode }> = {
  about: {
    title: "About NOVSMM",
    subtitle: "The infrastructure layer for social media marketing at scale.",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Mission</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM exists to eliminate the operational chaos of social media marketing reselling.
            We provide the payment, fulfillment, catalog, and analytics infrastructure that lets
            resellers, agencies, and enterprises focus on growth — not on stitching together
            spreadsheets, Telegram bots, and manual provider portals.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Our platform processes millions of orders across 16+ social platforms with sub-second
            fulfillment dispatch, real-time wallet settlement in 8+ currencies, and a public API
            compatible with the PerfectPanel / JAP reseller ecosystem — the de-facto industry
            standard.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">By the numbers</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-2xl font-bold text-foreground">6,382</div>
              <div className="text-xs text-muted-foreground">Active services</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-2xl font-bold text-foreground">16+</div>
              <div className="text-xs text-muted-foreground">Social platforms</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-2xl font-bold text-foreground">4</div>
              <div className="text-xs text-muted-foreground">Payment gateways</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-2xl font-bold text-foreground">99.99%</div>
              <div className="text-xs text-muted-foreground">Uptime SLA</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Technology</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM is built on Next.js 16 with TypeScript, PostgreSQL, and Redis. The platform
            uses a service-oriented architecture with BullMQ background workers, Socket.IO
            real-time notifications, and AES-256-GCM encryption at rest. All API keys are
            stored as bcrypt hashes with SHA-256 lookup indices for O(1) validation.
            Webhook signatures are verified via HMAC-SHA256 for Stripe, Mercado Pago, and
            NowPayments integrations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Security & compliance</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> AES-256-GCM encryption for all credentials, API keys, and payment method configs at rest</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> TOTP-based 2FA with encrypted secrets and bcrypt-hashed backup codes</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> Brute-force lockout (5 attempts / 15 min) backed by Redis for cross-instance enforcement</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> Content-Security-Policy with frame-ancestors none, HSTS preload, X-Frame-Options DENY</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> CSRF protection via Origin header value-matching on all state-changing requests</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> Per-API-key rate limiting (60 req/min) with IP allowlisting support</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> GDPR self-service account deletion with personal data anonymization</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> Comprehensive audit logging (userId, action, entity, IP, User-Agent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Headquarters</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            NOVSMM, Inc. is incorporated as a digital services company. For legal inquiries,
            contact <a href="mailto:legal@novsmm.com" className="text-primary hover:underline">legal@novsmm.com</a>.
            For business partnerships, contact <a href="mailto:partners@novsmm.com" className="text-primary hover:underline">partners@novsmm.com</a>.
          </p>
        </section>
      </div>
    ),
  },

  careers: {
    title: "Careers at NOVSMM",
    subtitle: "Build the infrastructure that powers millions of social media transactions.",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Our culture</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We're a remote-first team of engineers, designers, and operators who believe that
            infrastructure should be invisible. Our codebase is TypeScript end-to-end, our
            deployments are Dockerized, and our monitoring is Prometheus + Grafana. We ship
            daily, review every PR, and measure everything.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We don't track hours. We track impact. If you can ship features that make resellers
            more money, you belong here.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Open positions</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Senior Full-Stack Engineer</div>
                  <div className="text-xs text-muted-foreground">Remote · Full-time · Engineering</div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">Open</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Next.js 16 + TypeScript + PostgreSQL + Redis. You'll own the dashboard and API surface end-to-end. Minimum 5 years production experience.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">DevOps / SRE Engineer</div>
                  <div className="text-xs text-muted-foreground">Remote · Full-time · Infrastructure</div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">Open</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Docker, CI/CD, Prometheus, Grafana, AlertManager. You'll own deployment pipelines, monitoring, and incident response. On-call rotation required.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Payment Integrations Engineer</div>
                  <div className="text-xs text-muted-foreground">Remote · Full-time · Engineering</div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">Open</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Stripe, Mercado Pago, PayPal, NowPayments, crypto gateways. You'll build and maintain payment flows, webhook handlers, and reconciliation logic.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Customer Success Manager</div>
                  <div className="text-xs text-muted-foreground">Remote · Full-time · Operations</div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">Open</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Manage enterprise reseller accounts, handle escalations, and drive product feedback. Fluent English + Spanish required.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Benefits</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Competitive salary</div>
              <div className="text-xs text-muted-foreground">Above market rate, paid in USD</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Remote-first</div>
              <div className="text-xs text-muted-foreground">Work from anywhere, async by default</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Equity</div>
              <div className="text-xs text-muted-foreground">Stock options for all full-time roles</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Learning budget</div>
              <div className="text-xs text-muted-foreground">$2,000/year for courses, conferences, books</div>
            </div>
          </div>
        </section>

        <section>
          <p className="text-sm text-muted-foreground">
            To apply, send your GitHub profile and a brief note about what you'd build to{" "}
            <a href="mailto:careers@novsmm.com" className="text-primary hover:underline">careers@novsmm.com</a>.
            No CVs, no cover letters — just code and ideas.
          </p>
        </section>
      </div>
    ),
  },

  press: {
    title: "Press & Media",
    subtitle: "Brand assets, press releases, and media contact information.",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">About NOVSMM</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM is a social media marketing infrastructure platform that provides resellers,
            agencies, and enterprises with a unified control surface for order fulfillment,
            payment processing, and real-time analytics across 16+ social platforms. The platform
            processes millions of orders with a 99.99% uptime SLA and is compatible with the
            PerfectPanel / JAP reseller API ecosystem.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Brand assets</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Primary logo</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-10 items-center gap-2 rounded-lg bg-foreground px-3">
                  <div className="h-5 w-5 rounded-full bg-background" />
                  <span className="text-sm font-bold text-background">NOVSMM</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Download: <a href="/logo.svg" className="text-primary hover:underline">SVG</a> · <a href="/novsmm-logo.png" className="text-primary hover:underline">PNG</a></div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">Color palette</div>
              <div className="mt-2 flex gap-2">
                <div className="h-8 w-8 rounded-lg bg-foreground" title="Primary: #0a0a0a" />
                <div className="h-8 w-8 rounded-lg bg-primary" title="Accent: #2563eb" />
                <div className="h-8 w-8 rounded-lg bg-emerald-500" title="Success: #10b981" />
                <div className="h-8 w-8 rounded-lg bg-amber-500" title="Warning: #f59e0b" />
                <div className="h-8 w-8 rounded-lg bg-red-500" title="Danger: #ef4444" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Primary: #0a0a0a · Accent: #2563eb</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Press releases</h2>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">July 2026</div>
              <div className="text-sm font-medium text-foreground">NOVSMM launches PerfectPanel-compatible API v1 with 7 endpoints</div>
              <p className="mt-1 text-xs text-muted-foreground">The new public API enables resellers to integrate NOVSMM with existing bots and panels without code modifications.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">July 2026</div>
              <div className="text-sm font-medium text-foreground">NOVSMM introduces SMM subscriptions and auto-refill workers</div>
              <p className="mt-1 text-xs text-muted-foreground">Users can now configure auto-delivery for new posts with automated drop detection and refill requests.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">June 2026</div>
              <div className="text-sm font-medium text-foreground">NOVSMM completes comprehensive security audit — 15 controls verified, 0 critical vulnerabilities</div>
              <p className="mt-1 text-xs text-muted-foreground">Audit covered CSP, CSRF, SQL injection, authentication, credential exposure, CORS, and session management.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Media contact</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For press inquiries, interviews, or product demos, contact{" "}
            <a href="mailto:press@novsmm.com" className="text-primary hover:underline">press@novsmm.com</a>.
            Response time: within 24 hours.
          </p>
        </section>
      </div>
    ),
  },

  partners: {
    title: "Partner Program",
    subtitle: "Integrate, resell, or build on top of the NOVSMM infrastructure.",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Why partner with NOVSMM?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM's partner program is designed for technology companies, reseller networks, and
            white-label operators who want to leverage our infrastructure without building it
            from scratch. Partners get access to our public API, child-panel provisioning,
            custom markup rules, and priority support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Partner tiers</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-foreground">Reseller Partner</div>
                <span className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-medium text-primary-foreground">$49/mo</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Self-service child panel with subdomain + API key</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Custom markup (0-100%) on all services</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Full reseller API (7 PerfectPanel-compatible endpoints)</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> 60 API requests/min per key</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Email support · 24h SLA</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-foreground">Agency Partner</div>
                <span className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-medium text-primary-foreground">$149/mo</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Everything in Reseller, plus:</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Multi-provider failover with priority routing</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Role-based access control (RBAC) for team members</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Advanced analytics (cohort, geographic, funnel)</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> 200 API requests/min per key</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Priority support · 4h SLA</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-foreground">Enterprise Partner</div>
                <span className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-medium text-primary-foreground">$499/mo</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Everything in Agency, plus:</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> White-label licensing + custom branding</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Dedicated account manager</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Custom SLA (99.99% uptime target)</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Unlimited API requests</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Live chat support · 2h SLA</li>
                <li className="flex items-start gap-2"><span className="text-primary">✓</span> Audit logs + CSV export</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Technology partners</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If you're a SMM panel provider, payment gateway, or social media platform looking to
            integrate with NOVSMM, we offer free API access for development and testing. Our
            webhook system supports HMAC-signed outbound notifications for order status changes,
            payment events, and refill requests.
          </p>
        </section>

        <section>
          <p className="text-sm text-muted-foreground">
            To apply for the partner program, contact{" "}
            <a href="mailto:partners@novsmm.com" className="text-primary hover:underline">partners@novsmm.com</a>{" "}
            with your business details and intended use case.
          </p>
        </section>
      </div>
    ),
  },

  legal: {
    title: "Legal Information",
    subtitle: "Company registration, compliance, and legal framework.",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Company information</h2>
          <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Legal name:</span> NOVSMM, Inc.</div>
            <div className="mt-1"><span className="font-medium text-foreground">Type:</span> Digital services company</div>
            <div className="mt-1"><span className="font-medium text-foreground">Registered address:</span> Available upon request to legal@novsmm.com</div>
            <div className="mt-1"><span className="font-medium text-foreground">Contact email:</span> <a href="mailto:legal@novsmm.com" className="text-primary hover:underline">legal@novsmm.com</a></div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Regulatory compliance</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <span><strong className="text-foreground">GDPR (EU):</strong> Self-service account deletion with personal data anonymization. Data processing agreements available upon request. Users can export their data and request erasure at any time.</span></li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <span><strong className="text-foreground">PCI DSS:</strong> All payment card processing is handled by PCI-DSS Level 1 certified providers (Stripe, PayPal). NOVSMM never stores, transmits, or processes raw card data. Card data is tokenized at the provider level.</span></li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <span><strong className="text-foreground">Data encryption:</strong> All credentials, API keys, and payment method configurations are encrypted at rest using AES-256-GCM with random IVs and authentication tags. Encryption keys are derived from a server-side master key stored in environment variables.</span></li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <span><strong className="text-foreground">Audit trail:</strong> All administrative actions (user management, role changes, refunds, impersonation) are logged with userId, action, entity, IP address, and User-Agent. Logs are retained for 365 days.</span></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Intellectual property</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The NOVSMM platform, including its source code, design, brand assets, and documentation,
            is the proprietary property of NOVSMM, Inc. Unauthorized reproduction, distribution, or
            modification of the platform is prohibited. The "NOVSMM" name, logo, and visual identity
            are trademarks of NOVSMM, Inc.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Third-party trademarks (Instagram, TikTok, YouTube, PayPal, Stripe, Mercado Pago, etc.)
            are the property of their respective owners and are used on this platform for
            identification purposes only. NOVSMM is not affiliated with or endorsed by any social
            media platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Law enforcement</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Law enforcement requests should be directed to <a href="mailto:legal@novsmm.com" className="text-primary hover:underline">legal@novsmm.com</a>.
            We comply with valid legal process (court orders, subpoenas) within the jurisdiction
            where the company is registered. We do not voluntarily share user data without legal
            process.
          </p>
        </section>

        <section>
          <p className="text-xs text-muted-foreground">
            For specific legal questions not covered here, please consult with a qualified attorney.
            This page provides general information and does not constitute legal advice.
          </p>
        </section>
      </div>
    ),
  },

  privacy: {
    title: "Privacy Policy",
    subtitle: "Last updated: July 2026",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Data we collect</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Account data:</strong> Name, username, email address,
            country, preferred currency, preferred language, and password (stored as a bcrypt hash
            with cost factor 12 — never in plaintext).
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Transaction data:</strong> Order history, wallet
            balance, transaction records (top-ups, withdrawals, sales, fees), payment method
            references (tokenized — we do not store card numbers), and referral earnings.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Usage data:</strong> IP address, User-Agent,
            session timestamps, API key usage statistics, and audit log entries (action, entity,
            timestamp). We use this for security, fraud prevention, and rate limiting.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Support data:</strong> Support ticket messages and
            file attachments (images, PDFs) — sanitized to prevent XSS, stored encrypted at rest.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. How we use your data</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> To provide the NOVSMM platform (order processing, wallet management, analytics)</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> To process payments via third-party providers (Stripe, PayPal, Mercado Pago, NowPayments)</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> To send transactional emails (order confirmations, ticket replies, security alerts)</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> To prevent fraud, abuse, and unauthorized access (brute-force protection, rate limiting)</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> To comply with legal obligations and law enforcement requests (with valid legal process)</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> To improve the platform (aggregate analytics, performance monitoring via Prometheus)</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            We <strong className="text-foreground">do not</strong> sell your personal data to third
            parties. We do not use your data for advertising. We do not share your data with social
            media platforms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Data retention</h2>
          <table className="mt-3 w-full text-sm text-muted-foreground">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Data type</th>
                <th className="py-2 pr-4 font-medium">Retention period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr><td className="py-2 pr-4">Account data</td><td className="py-2 pr-4">Until account deletion (GDPR self-service)</td></tr>
              <tr><td className="py-2 pr-4">Transaction records</td><td className="py-2 pr-4">7 years (financial audit requirement)</td></tr>
              <tr><td className="py-2 pr-4">Audit logs</td><td className="py-2 pr-4">365 days</td></tr>
              <tr><td className="py-2 pr-4">Support tickets</td><td className="py-2 pr-4">2 years after resolution</td></tr>
              <tr><td className="py-2 pr-4">Session data</td><td className="py-2 pr-4">30 days (JWT expiry)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Your rights (GDPR)</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Right to access:</strong> Request a copy of your personal data via /api/me</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Right to erasure:</strong> Self-service account deletion via Dashboard → Profile → Danger Zone. Personal data is anonymized; financial records are retained for audit.</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Right to rectification:</strong> Update your profile data via Dashboard → Profile</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Right to data portability:</strong> Export your orders and transactions as CSV via Dashboard</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Right to object:</strong> Contact privacy@novsmm.com to object to specific data processing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Data security</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            All sensitive data is encrypted at rest using AES-256-GCM. Passwords are hashed with
            bcrypt (cost 12). API keys are stored as bcrypt hashes with SHA-256 lookup indices.
            Session cookies are httpOnly, secure (production), and sameSite=lax. The platform
            enforces Content-Security-Policy, HSTS, X-Frame-Options DENY, and CSRF Origin
            verification. Brute-force protection locks accounts after 5 failed attempts for 15 minutes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Contact</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For privacy questions or data requests, contact{" "}
            <a href="mailto:privacy@novsmm.com" className="text-primary hover:underline">privacy@novsmm.com</a>.
            We respond within 72 hours.
          </p>
        </section>
      </div>
    ),
  },

  terms: {
    title: "Terms of Service",
    subtitle: "Last updated: July 2026",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of terms</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            By creating a NOVSMM account, using the platform API, or placing an order, you agree
            to these Terms of Service. If you do not agree, you may not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Service description</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM provides social media marketing infrastructure including order fulfillment,
            payment processing, wallet management, a service catalog, marketplace functionality,
            and a public API. The platform acts as an intermediary between buyers (resellers,
            agencies, end-users) and upstream providers. NOVSMM does not guarantee specific
            delivery results — delivery times and service quality depend on the upstream provider.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Account responsibilities</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> You must be 18+ to create an account</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> You are responsible for all activity under your account and API keys</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> You must not share your API keys, passwords, or 2FA backup codes</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> You must not use the platform for illegal activities, fraud, or money laundering</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> You must not attempt to reverse-engineer, scrape, or overload the platform</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> You must comply with the terms of service of each social media platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Orders & refunds</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Order placement:</strong> Orders are debited from
            your wallet balance at the time of placement. The debit is atomic — if your balance
            is insufficient, the order is not created.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Cancellation:</strong> Orders can be cancelled
            within 60 seconds of placement for a full refund to your wallet balance. After 60
            seconds, the order is forwarded to the upstream provider and cannot be cancelled.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Refills:</strong> If an order's delivered count
            drops within 30 days of completion, you may request a refill. Refills are processed
            as support tickets and fulfilled by the upstream provider. NOVSMM does not guarantee
            refill delivery time.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Partial delivery:</strong> If an order is partially
            delivered (status "partial"), the undelivered portion is automatically refunded to your
            wallet balance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Payments & wallet</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Wallet top-ups are processed via Stripe, PayPal, Mercado Pago, or NowPayments (crypto).
            Top-ups are credited to your wallet after the payment provider confirms the transaction.
            Crypto payments require 1-3 on-chain confirmations. The minimum withdrawal amount is
            $10. Withdrawals are processed within 48 hours. NOVSMM charges no deposit fees;
            payment provider fees (typically 2.9-3.99%) are deducted from the top-up amount.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. API usage</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The public API (v1) is rate-limited to 60 requests per minute per API key. API keys
            can be restricted by IP allowlist. Exceeding the rate limit results in HTTP 429
            responses. API keys can be revoked at any time via the admin panel or by contacting
            support. NOVSMM reserves the right to modify API endpoints, add new ones, or
            deprecate old ones with 30 days notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Limitation of liability</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM is provided "as is" without warranties of any kind. We do not guarantee
            uninterrupted service, specific delivery results, or the availability of any
            particular service. Our maximum liability is limited to the amount you have paid
            in the 30 days preceding any claim. We are not liable for indirect, incidental, or
            consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Account suspension</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We reserve the right to suspend or terminate accounts that violate these terms, engage
            in fraudulent activity, or abuse the platform. Suspended accounts retain access to
            their wallet balance for withdrawal but cannot place new orders. Refunds for
            suspended accounts are processed case-by-case.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Changes to terms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We may update these terms at any time. Material changes will be notified via email
            and in-app notification at least 7 days before taking effect. Continued use after
            the effective date constitutes acceptance.
          </p>
        </section>
      </div>
    ),
  },

  cookies: {
    title: "Cookie Policy",
    subtitle: "How NOVSMM uses cookies and local storage.",
    content: (
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">What are cookies?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cookies are small text files stored in your browser. NOVSMM uses cookies and
            browser local storage to maintain your session, remember preferences, and provide
            a functional user experience. We do not use cookies for advertising, tracking, or
            third-party analytics.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Cookies we use</h2>
          <table className="mt-3 w-full text-sm text-muted-foreground">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Cookie</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 pr-4 font-medium">Duration</th>
                <th className="py-2 pr-4 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">next-auth.session-token</td>
                <td className="py-2 pr-4">Authentication session (JWT)</td>
                <td className="py-2 pr-4">30 days</td>
                <td className="py-2 pr-4">httpOnly · secure · sameSite=lax</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">next-auth.csrf-token</td>
                <td className="py-2 pr-4">CSRF protection</td>
                <td className="py-2 pr-4">Session</td>
                <td className="py-2 pr-4">httpOnly · secure · sameSite=lax</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">next-auth.callback-url</td>
                <td className="py-2 pr-4">Redirect after login</td>
                <td className="py-2 pr-4">Session</td>
                <td className="py-2 pr-4">httpOnly · secure · sameSite=lax</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Local storage</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM uses browser local storage for:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Theme preference:</strong> Light/dark mode toggle</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">Dashboard state:</strong> Active tab, sidebar collapse state</li>
            <li className="flex items-start gap-2"><span className="text-primary">▸</span> <strong className="text-foreground">React Query cache:</strong> API response cache (TanStack Query)</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Local storage data is not sent to the server. It persists until you clear browser data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Third-party cookies</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            NOVSMM does not set third-party cookies. However, when you use payment methods (Stripe,
            PayPal, Mercado Pago), those providers may set their own cookies on their domains.
            These are governed by the respective provider's cookie policy. We do not control and
            are not responsible for third-party cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Managing cookies</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You can manage or delete cookies in your browser settings. Disabling session cookies
            will prevent you from logging in. The NOVSMM platform does not function without
            authentication cookies — there is no "cookie-free" mode.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            To clear all NOVSMM data: go to your browser settings → Site data → Clear data for
            this site. This will log you out and reset your preferences.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Service Worker (PWA)</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If you install NOVSMM as a Progressive Web App (PWA), a service worker is registered
            in production mode only. The service worker caches the app shell (HTML, CSS, JS) for
            offline access. It does NOT cache API responses or personal data. The service worker
            can be removed by uninstalling the PWA or clearing site data.
          </p>
        </section>
      </div>
    ),
  },
};

export function LegalPages({
  page,
  onClose,
}: {
  page: LegalPageType | null;
  onClose: () => void;
}) {
  // Lock body scroll + ESC to close
  useEffect(() => {
    if (!page) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [page, onClose]);

  const pageData = page ? PAGES[page] : null;

  return (
    <AnimatePresence>
      {pageData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative my-8 w-full max-w-3xl rounded-2xl border border-border/60 bg-background p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-6 flex items-center gap-3 border-b border-border/40 pb-6">
              <Logo />
              <div className="ml-auto" />
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">{pageData.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{pageData.subtitle}</p>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2 nov-scroll">
              {pageData.content}
            </div>

            {/* Footer */}
            <div className="mt-8 border-t border-border/40 pt-6 text-center">
              <p className="text-xs text-muted-foreground">
                © 2026 NOVSMM, Inc. · Questions? Contact{" "}
                <a href="mailto:support@novsmm.com" className="text-primary hover:underline">support@novsmm.com</a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
