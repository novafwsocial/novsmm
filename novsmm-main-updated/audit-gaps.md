# NOVSMM — Full-Platform Feature Gap & Premium Opportunity Audit

**Task ID:** AUDIT-FULL
**Auditor:** gap-auditor (general-purpose sub-agent)
**Scope:** Every surface of the NOVSMM web app — landing page (9 sections), authentication (5 flows), user dashboard (8 tabs), admin panel (17 tabs), and the full API surface (71 route files, 88 handlers). This audit builds on the existing `audit-report.md` (UI→API connection audit) and focuses exclusively on **what's missing vs. competitors** and **what premium features would differentiate NOVSMM**.
**Method:** Read-only audit. No source files were modified except this report and `worklog.md`.

---

## 1. Executive Summary

NOVSMM today is a **production-grade SaaS scaffolding** with a Stripe-level landing page, a complete NextAuth + Prisma backend, a real WebSocket-driven dashboard, and a 17-tab admin panel. The structural engineering is further along than most SMM panels ever reach. However, the platform is **missing many of the operational features that real SMM resellers and agencies need to switch from a competitor like JustAnotherPanel, SMMRaja, or Peakerr** — and it's missing the **premium, AI-driven, white-glove features that would let NOVSMM charge $299/mo instead of $29/mo**.

### Headline findings

| Category | Status |
|---|---|
| **Landing page polish** | ✅ Best-in-class. 9 animated sections, premium scroll experience. |
| **Auth foundation** | ✅ Real NextAuth, bcrypt, 2FA, forgot/reset/verify endpoints exist. ⚠️ Email verification isn't enforced, no passkeys, no SSO. |
| **User dashboard breadth** | ⚠️ 8 tabs all wired to real APIs, but missing 14 features competitors consider table-stakes (drip-feed, mass orders, refill requests, subscriptions-on-services, etc.). |
| **Admin panel depth** | ⚠️ 17 tabs and growing, but missing 12 features operators need (transactions tab, user detail drill-down, email templates, fraud rules, KYC, impersonation). |
| **Public API (v1)** | ❌ Only 2 endpoints (`/services` + `/orders`). Competitors ship 12-20 endpoints + SDKs + outbound webhooks. |
| **Premium differentiators** | ❌ Zero AI features. Zero analytics products. Zero agency/CRM tooling. The platform ships the *infrastructure* but not the *insight layer* that justifies enterprise pricing. |
| **Mobile experience** | ⚠️ Responsive but no PWA, no native app, no push notifications. |
| **Self-service gaps** | ❌ Users cannot generate their own API keys, configure their own webhooks, upload an avatar, delete their account, or invite team members. |

### The opportunity

NOVSMM's *design quality* and *real-time infrastructure* are already superior to every SMM panel on the market. The bottleneck isn't polish — it's **feature parity with the boring operational stuff** (drip-feed, mass orders, refill buttons) and **feature leapfrog with the premium stuff** (AI recommendations, fraud detection, reseller storefronts, agency CRM). Closing both gaps in the right order would let NOVSMM position as the "Stripe of SMM" rather than "another pretty SMM panel".

---

## 2. Critical Gaps (P0 / P1 / P2)

> **P0** = blocks paying customers from completing core workflows (must fix before scaling paid acquisition)
> **P1** = competitors have it; its absence is a deal-breaker for serious resellers (fix within 30 days)
> **P2** = nice-to-have polish that improves retention and upsell (fix within 90 days)

### 2.1 User Dashboard gaps

| # | Gap | Severity | Notes |
|---|---|---|---|
| U-1 | **No drip-feed / split-order** (schedule delivery across hours/days) | **P0** | Every SMM panel since 2018 has this. Power users will not switch without it. Affects ~40% of orders on typical panels. |
| U-2 | **No mass order form** (paste multiple `link,service_id,qty` lines → bulk-create) | **P0** | Resellers place 50-500 orders/day. The current one-at-a-time modal is unusable for them. |
| U-3 | **No order detail view** (clicking an order row does nothing) | **P0** | Users can't see the link they bought, the provider, the completion timestamp, or the per-step progress history. Currently the table is read-only. |
| U-4 | **No refill / re-delivery request button** | **P0** | When followers drop (and they always do), users need a one-click "refill" button on completed orders. Standard SMM panel feature. |
| U-5 | **No order cancellation** (user side, within X seconds of placement) | **P1** | Currently only admin can cancel. Users should be able to cancel within 60s if they made a typo in the link. |
| U-6 | **No "saved links" / address book** | **P1** | Resellers re-order for the same 5-20 Instagram/TikTok accounts daily. Saved-link autocomplete would save 30s per order. |
| U-7 | **No order templates** ("reorder" exists but no "save as preset") | **P1** | Power users want one-click reorder of their most common configurations. |
| U-8 | **No service reviews / ratings** | **P1** | Buyers can't evaluate quality before purchasing. Marketplace trust gap. |
| U-9 | **No service quality indicators** (drop rate, avg delivery time, refill rate, last-30d completion %) | **P1** | Resellers need to know which services to avoid. Currently only `quality` (standard/hq/premium/real) and `rate` are shown. |
| U-10 | **No subscription orders** (auto-renew weekly: e.g. "+1,000 followers every Monday") | **P1** | Top-tier panels offer this. High LTV feature for agencies managing client accounts. |
| U-11 | **No multi-link order** (one order, N URLs, qty split evenly or custom) | **P1** | Common request from agencies running multi-account campaigns. |
| U-12 | **No transaction search/filter** in wallet | **P1** | Currently a flat list of all transactions. Power users need `type=topup&method=stripe&date=2024-01` filters. |
| U-13 | **No invoice PDF download** (CSV export only) | **P1** | Enterprises and agencies need PDF invoices with their company name, tax ID, line items. |
| U-14 | **No activity log for the user** (own audit log of login, password change, API calls) | **P2** | GDPR/SOC2 expectation; admins have AuditLog but users can't see their own. |
| U-15 | **No avatar upload** (`dashboard-profile.tsx` shows hardcoded initials "DR") | **P2** | `/api/uploads` exists for ticket attachments; same endpoint could power avatars. |
| U-16 | **No dark mode toggle in UI** (only via ⌘K command palette) | **P2** | Theme toggle component exists but isn't surfaced in the sidebar or profile menu. |
| U-17 | **No mobile push notifications** (only in-app WebSocket) | **P2** | PWA + Web Push would let users get notified on phone without an app. |
| U-18 | **No referral dashboard with detailed analytics** (signups, earnings per referral, conversion rate) | **P2** | Current referrals section shows count + total. Power affiliates need cohort views. |
| U-19 | **No saved payment methods** (user re-enters card every top-up) | **P2** | Stripe customer objects allow this; would reduce top-up friction. |
| U-20 | **No sub-account / team member invitations** | **P1** | Schema has `Subscription.seatsUsed/seatsLimit` but no invite flow. Agencies on Growth (10 seats) and Enterprise (100 seats) literally cannot use their seats. |
| U-21 | **No self-service API key generation** | **P1** | API keys can only be created by admins (AdminApiKeys tab). Resellers should be able to generate their own keys from a "Developers" tab in their profile. |
| U-22 | **No outbound webhook configuration** (user registers a URL → NOVSMM POSTs order status changes) | **P1** | Power resellers integrate NOVSMM into their own dashboards; they need webhooks to know when orders complete. |
| U-23 | **No ticket categories** (order issue / payment issue / account issue / other) | **P2** | All tickets land in one queue; categorization would speed up triage. |
| U-24 | **No live chat with support agents** (only async tickets with simulated auto-reply) | **P2** | Premium plans advertise "Live chat support · 2h SLA" but there's no live chat. |
| U-25 | **No multi-currency wallet** (only USD balance) | **P2** | Users in LATAM often want to hold MXN/BRL balance separately. Currently the wallet is USD-only; conversion happens at display time. |

### 2.2 Admin Panel gaps

| # | Gap | Severity | Notes |
|---|---|---|---|
| A-1 | **No Transactions tab** | **P0** | Admins can refund via the Refunds tab (which lists `recentTransactions` from `/admin/overview`), but there's no searchable, filterable Transactions table. Operators cannot reconcile against payment provider settlements without this. |
| A-2 | **No User Detail / Customer 360 view** | **P0** | Clicking a user row does nothing. Admins cannot see: user's order history, transaction history, tickets, login sessions, audit log, KYC status, IP history, current balance breakdown. This is the #1 admin workflow gap. |
| A-3 | **No email templates editor** | **P1** | Welcome email, password reset, order confirmation, withdrawal approved, etc. are hardcoded in `lib/notify.ts`. Admins should be able to edit copy + add custom templates without a deploy. |
| A-4 | **No bulk service import (CSV)** | **P1** | Adding services one-by-one via modal is fine for 12 services; unworkable for the 6,382 services the landing page advertises. Need a CSV import + provider auto-sync. |
| A-5 | **No service markup rules** (auto-price = cost × 1.4 + $0.10 floor) | **P1** | Admins currently set each service's price manually. Should be rule-driven: per-platform markup, per-quality markup, global floor/ceiling. |
| A-6 | **No provider auto-sync cron** (provider adds a service → NOVSMM auto-imports it) | **P1** | `POST /api/admin/providers/[id]/sync` is manual and "simulated" per `audit-report.md`. Needs a real cron + provider API polling. |
| A-7 | **No user impersonation** ("login as user" for support) | **P1** | Support agents routinely need to see what the user sees. Currently they'd have to ask for screenshots. Standard support tool. |
| A-8 | **No fraud detection rules** | **P1** | Admin "Security" tab is decorative cards. Need: rule engine (e.g., flag users with >3 chargebacks, flag orders to known-fraud URLs, velocity rules on top-ups). |
| A-9 | **No KYC / identity verification** | **P2** | For withdrawals above a threshold, KYC is standard. Currently anyone can withdraw to any destination. |
| A-10 | **No geographic / cohort analytics** | **P2** | Admin overview shows totals + 30d revenue series. No breakdown by country, by signup cohort, by user plan. |
| A-11 | **No feature flags / kill switches** | **P2** | Can't disable a feature for one user segment or rollback a broken feature without a deploy. |
| A-12 | **No maintenance mode** | **P2** | Can't show a banner + block new orders during deployments. |
| A-13 | **No admin announcements / blog / CMS** | **P2** | No way to publish platform-wide announcements (new features, scheduled maintenance) to all users. |
| A-14 | **No email campaign / mass mailing** | **P2** | Broadcast notification exists (in-app + email), but no segmented email campaigns (e.g., "users with balance > $100 who haven't ordered in 30d"). |
| A-15 | **No currency auto-rate sync** | **P2** | Admin sets `rate` manually per currency. Should pull from a daily FX API (exchangerate.host, Open Exchange Rates). |
| A-16 | **No translation management UI** (i18n strings) | **P2** | Languages are managed (add/disable), but the actual translated strings aren't editable. Admins can't fix a typo in the Spanish translation without a code change. |
| A-17 | **No FAQ / Knowledge Base CMS** | **P2** | Reduces support ticket volume; standard help-desk feature. |
| A-18 | **No webhook retry / replay** | **P2** | AdminWebhooks is read-only. Should allow retry of failed webhooks and show delivery timeline. |
| A-19 | **No 2FA enforcement policy** (require 2FA for admins / for users above $X balance) | **P2** | 2FA exists per-user but admins can't enforce it org-wide. |
| A-20 | **No platform / per-service health alerts** | **P2** | When provider P-03 went "degraded" in the overview health card, no alert was sent. Admins need Slack/email/push on provider status changes. |
| A-21 | **No payout schedule configuration** | **P2** | Withdrawals are processed manually via Approve/Reject. Need configurable auto-approve rules (under $50, verified KYC, no recent chargeback → auto-approve). |
| A-22 | **No login history per user** (drill-down) | **P2** | `AuditLog` captures logins but the admin can't filter by user. |
| A-23 | **No coupon bulk-generation** (create 1,000 unique codes for a promo) | **P2** | Currently one coupon at a time. Influencer/affiliate campaigns need bulk codes. |
| A-24 | **No tax / invoicing configuration** (VAT, tax ID per user, tax-exempt) | **P2** | EU customers need VAT-compliant invoices. |

### 2.3 Authentication gaps

| # | Gap | Severity | Notes |
|---|---|---|---|
| Au-1 | **Email verification not enforced** | **P0** | `/api/auth/verify-email` endpoint exists but unverified users can still log in, place orders, withdraw. A bounce from a typo'd email = lost customer + fraud vector. |
| Au-2 | **No password reset token UI** (the `/?reset=<token>` URL has no consumer) | **P0** | Endpoint exists, email sends the link, but clicking it does nothing because the SPA doesn't render a reset form. The "Forgot password" modal in `login-screen.tsx` was added recently but doesn't handle the inbound link. |
| Au-3 | **No passkey / WebAuthn login** | **P1** | The Security landing card advertises "Passkey + WebAuthn" but it's not implemented. Apple/Google password managers now default to passkeys; users expect it. |
| Au-4 | **No SSO (SAML / Google Workspace / Microsoft)** | **P1** | Enterprise plan advertises "Custom roles & permissions" but no SSO. Enterprise buyers require SSO. |
| Au-5 | **No SCIM user provisioning** | **P1** | Security card advertises SCIM. Not implemented. Enterprises use SCIM to auto-provision/deprovision users from Okta/Azure AD. |
| Au-6 | **No magic link sign-in** | **P2** | Passwordless email login. Lower friction for first-time users. |
| Au-7 | **No phone/SMS OTP login** | **P2** | LATAM market prefers phone-based auth. |
| Au-8 | **No account deletion flow** (GDPR right to erasure) | **P1** | No "Delete my account" button. GDPR requires it. |
| Au-9 | **No data export (GDPR portability)** | **P1** | CSV export exists for orders/transactions/audit logs individually, but no "Download all my data" button. |
| Au-10 | **No password breach check** (HaveIBeenPwned API) | **P2** | Reject passwords that appear in known breaches. |
| Au-11 | **No concurrent session limit** | **P2** | A user can be logged in on unlimited devices. Account-sharing is a revenue leak for paid plans. |
| Au-12 | **No session timeout warning** | **P2** | Sessions silently expire. Should warn 5 min before. |
| Au-13 | **Telegram & Apple OAuth buttons return "coming soon"** | **P2** | Either implement or remove the buttons (currently a trust-eroding tease). |
| Au-14 | **No IP capture on login** | **P2** | `AuditLog.ip` column exists but is never populated. Sessions page can't show "logged in from São Paulo, Brazil". |
| Au-15 | **No account lockout after failed attempts** | **P1** | Brute-force protection is bcrypt timing only. Need: 5 failed attempts → 15-min lockout + email alert. |

### 2.4 Landing Page gaps

| # | Gap | Severity | Notes |
|---|---|---|---|
| L-1 | **No drip-feed / mass-order callouts in Plans or Marketplace sections** | **P1** | Since these features don't exist, the marketing copy doesn't mention them — but competitors' landing pages prominently feature them. Need to build the feature *and* surface it. |
| L-2 | **No feature comparison table** (Free vs Starter vs Growth vs Enterprise) | **P1** | Plans section shows 3 cards with feature lists but no side-by-side matrix. Buyers comparison-shop; a table converts better. |
| L-3 | **No FAQ section** | **P1** | Reduces sales-email volume; SEO value. |
| L-4 | **No ROI / margin calculator** for resellers | **P1** | "If you buy at $0.84 and resell at $2.40, you make $1.56 per 1K — at 100K/wk that's $156/wk". High-converting interactive tool. |
| L-5 | **No affiliate program page** (separate from referrals) | **P2** | Referrals exist (5% lifetime) but there's no public affiliate landing page for influencers. |
| L-6 | **No case studies / customer stories** (Testimonials section has quotes but no full stories) | **P2** | Enterprise buyers want depth. |
| L-7 | **No blog / content / changelog** | **P2** | SEO + thought leadership. |
| L-8 | **No public API documentation page** | **P1** | `/api/docs` returns an OpenAPI spec but no human-readable docs page. Developers evaluating the API can't. |
| L-9 | **No public status page** | **P2** | `/api/status` exists but no `status.novsmm.com`-style page. |
| L-10 | **No demo video / interactive product tour** | **P2** | "Start free" requires signup. A 60-sec Loom-style walkthrough would convert more top-of-funnel visitors. |
| L-11 | **No comparison vs competitors section** | **P2** | "NOVSMM vs JustAnotherPanel vs Peakerr" comparison tables convert well. |
| L-12 | **No press / media kit** | **P2** | Footer "Press" link is a toast. |
| L-13 | **No careers page** | **P2** | Footer "Careers" link is a toast. |
| L-14 | **No Terms / Privacy / Cookies pages** | **P1** | Footer buttons show a "coming soon" toast. GDPR/CCPA require real legal pages. **Legal risk.** |
| L-15 | **No live chat widget** (only async WhatsApp + tickets) | **P2** | Premium plans promise "Live chat support" but the landing page itself has no live chat (only the WhatsApp widget). |
| L-16 | **No "Trusted by" customer logo strip** | **P2** | Stats section has counters but no customer logos. B2B buyers look for social proof. |
| L-17 | **Plans CTAs say "Start free" but there's no free trial flow** | **P1** | Clicking "Start free" goes to `/register`. After register, the user lands on dashboard home, not on a trial checkout. The "14-day trial" promise is unfulfilled. |
| L-18 | **No multi-language toggle on landing** | **P2** | Languages are managed in the admin and selectable in the dashboard, but the landing page is English-only. |

### 2.5 API completeness gaps

The current public API (`/api/v1/*`) ships only **2 endpoints**. Competitive SMM panel APIs typically ship 12-20. Missing endpoints:

| # | Endpoint | Severity | Notes |
|---|---|---|---|
| API-1 | `GET /api/v1/orders` (list user orders, paginated, filterable) | **P0** | Resellers need to sync order status to their own dashboards. |
| API-2 | `GET /api/v1/orders/:id` (single order status) | **P0** | Polling order status is the #1 API use case. |
| API-3 | `POST /api/v1/orders/cancel` | **P1** | Cancel within grace window. |
| API-4 | `GET /api/v1/balance` (wallet balance) | **P0** | Resellers need to display balance in their dashboards. |
| API-5 | `GET /api/v1/transactions` (wallet history) | **P1** | |
| API-6 | `POST /api/v1/wallet/topup` | **P1** | Initiate top-up programmatically. |
| API-7 | `GET /api/v1/services/:id` (service detail with quality/drop-rate) | **P1** | |
| API-8 | `GET /api/v1/services/categories` (group services by category) | **P2** | |
| API-9 | `POST /api/v1/orders/mass` (bulk-create up to 100 orders) | **P1** | Critical for reseller automation. |
| API-10 | `POST /api/v1/orders/drip-feed` (schedule order over time) | **P1** | Depends on U-1. |
| API-11 | `POST /api/v1/refill` (request refill on a completed order) | **P1** | Depends on U-4. |
| API-12 | `POST /api/v1/webhooks` (register outbound webhook URL + event types) | **P1** | |
| API-13 | `GET /api/v1/account` (profile, plan, limits) | **P1** | |
| API-14 | `GET /api/v1/invoices` (list + download PDF) | **P2** | |
| API-15 | `GET /api/v1/coupons/:code` (validate coupon) | **P2** | |

**Other API gaps:**
- **No rate-limit headers** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). Resellers can't implement backoff correctly.
- **No outbound webhooks** (order status change → POST to user's URL). Forces polling.
- **No SDKs** (JavaScript, Python, PHP). Resellers want a `npm install novsmm` and `pip install novsmm`.
- **No OAuth2** (only API key bearer). For marketplace apps, OAuth2 is expected.
- **No GraphQL endpoint**. Optional but trendy.
- **No API usage analytics** for the user (how many calls this month, error rate, p99 latency).

---

## 3. Premium Feature Recommendations

Grouped by surface. Each recommendation includes: **What** / **Why** / **Tier** (which plan it unlocks).

### 3.1 User Dashboard premium features

| # | Feature | What | Why | Tier |
|---|---|---|---|---|
| UD-1 | **AI Service Recommender** | "I want 10K Instagram followers in Mexico, real-looking, delivered over 7 days" → AI suggests the top 3 services ranked by drop-rate × delivery speed × price. | Removes decision paralysis (6,382 services is overwhelming). No competitor has this. | Growth+ |
| UD-2 | **Smart Budget Allocator** | "I have $50 to grow this TikTok account this month" → AI splits across followers, likes, views, comments for max engagement lift. | Agencies will pay $89/mo for this alone. Differentiator. | Growth+ |
| UD-3 | **Auto-Replenish** | Set a target (e.g. "always 10,000 followers on @acme"). When count drops below 9,500, NOVSMM auto-orders 500 more. | Set-and-forget is a huge value prop for agencies. | Growth+ |
| UD-4 | **Drip-feed Scheduler** | "Deliver 1,000 followers per day for 10 days" with start time, end time, randomization. | Standard feature in competitors; table-stakes. | All tiers (free = 7-day max, paid = unlimited) |
| UD-5 | **Order Template Library** | Save common order configurations as named templates. One-click reorder. | Power-user time-saver. | Starter+ |
| UD-6 | **Saved Links Manager** | Address book of Instagram/TikTok/etc. accounts with custom labels. Autocomplete in order modal. | Resellers manage 5-50 accounts; saves 30s/order. | All tiers |
| UD-7 | **Multi-Link Order** | Single order, N URLs, qty split evenly or with custom weights. | Agencies running multi-account campaigns. | Growth+ |
| UD-8 | **Service Quality Dashboard** | Per-service: 30-day drop rate, avg delivery time, refill rate, completion %, last-30d review score. | Builds marketplace trust; resellers can show data to their clients. | All tiers |
| UD-9 | **Refill Request Button** | One-click on completed orders within refill-eligible window. | Industry-standard. Currently missing. | All tiers |
| UD-10 | **Subscription Orders** | "Buy 1,000 followers every Monday at 9am" auto-recurring. | High LTV, agencies love it. | Growth+ |
| UD-11 | **Order Detail Drawer** | Slide-in drawer showing full order: link, provider, progress timeline (step-by-step), fulfillment logs, profit margin (for resellers), invoice link, refill/cancel buttons. | Currently you can't even see the link you ordered for. **Critical UX gap.** | All tiers |
| UD-12 | **Transaction Search & Filters** | Filter by type, method, date range, amount range; search by reference/ID. | Currently a flat list. Power users have hundreds of transactions. | All tiers |
| UD-13 | **Invoice PDF Generator** | Branded PDF invoice with user's company name, tax ID, line items, totals. Download per-invoice or bulk. | Enterprises need this for accounting. | Starter+ |
| UD-14 | **Multi-Currency Wallet** | Hold balances in USD, MXN, BRL, EUR simultaneously. Auto-convert at live FX. | LATAM users want to top up in MXN and spend in USD without conversion friction. | Growth+ |
| UD-15 | **Team Workspaces & Seat Invites** | Invite team members by email; assign role (owner/admin/billing/developer/viewer); see their activity. | Schema supports seats but no UI. **Critical for Growth/Enterprise plans.** | Growth+ (limited by seatsLimit) |
| UD-16 | **Self-Service API Keys** | Users generate/rotate/revoke their own API keys with scoped permissions. | Currently admin-only. Resellers need this. | Starter+ |
| UD-17 | **Outbound Webhooks** | User registers URL + event types → NOVSMM POSTs on order status change, transaction, low balance. | Replaces polling for resellers building on top. | Growth+ |
| UD-18 | **API Usage Analytics** | Per-key: calls this month, error rate, p99 latency, top endpoints, quota remaining. | Developers expect this. | Growth+ |
| UD-19 | **Referral Analytics Dashboard** | Cohort view: signups over time, earnings per referral, conversion rate, churn rate. | Power affiliates need data to optimize. | All tiers |
| UD-20 | **Saved Payment Methods** | Stripe customer object → save card for one-click top-up. | Reduces top-up friction 30%+. | All tiers |
| UD-21 | **Order Notes & Tags** | User can tag orders ("Client: Acme Co", "Campaign: Spring Launch") and filter by tag. | Agency workflow. | Growth+ |
| UD-22 | **Activity Log (own audit log)** | User sees their own logins, password changes, API calls, withdrawals. | GDPR transparency + trust. | All tiers |
| UD-23 | **PWA + Web Push** | Install NOVSMM as an app; get push notifications for order completion, low balance, withdrawals. | Mobile-first markets (LATAM, India). | All tiers |
| UD-24 | **Dark Mode Toggle (visible)** | Surface the existing theme toggle in the sidebar / profile menu. | Currently hidden in ⌘K palette. | All tiers |
| UD-25 | **Avatar Upload** | Use existing `/api/uploads` endpoint to upload a profile avatar. | Personalization. | All tiers |
| UD-26 | **Account Deletion Flow** | "Delete my account" → confirmation → schedule deletion → 30-day grace → permanent delete with GDPR-compliant data export. | Legal requirement. | All tiers |

### 3.2 Admin Panel premium features

| # | Feature | What | Why | Tier |
|---|---|---|---|---|
| AD-1 | **Customer 360 View** | Click a user → drawer/page showing: profile, balance breakdown, order history (filterable), transaction history, tickets, sessions, audit log, KYC, IP history, lifetime value, churn risk score. | The #1 admin workflow gap. | Admin |
| AD-2 | **Transactions Tab** | Searchable, filterable table of ALL transactions across all users. Reconcile against Stripe/MP/NowPayments settlements. Export to CSV. | Operators can't currently reconcile. | Admin |
| AD-3 | **Email Template Editor** | Visual editor for all transactional emails (welcome, reset, order confirm, withdrawal approved, low balance, etc.) with variables + live preview. | Removes deploy dependency for copy changes. | Admin |
| AD-4 | **Bulk Service Import (CSV)** | Upload a CSV of services → bulk-create. Provider auto-sync: connect HuntSMM/JustAnotherPanel API key → auto-import their full catalog with markup rule applied. | Currently 12 services; need 6,382. | Admin |
| AD-5 | **Service Markup Rules Engine** | Define rules: per-platform markup %, per-quality multiplier, global floor/ceiling, sale-price-rounding (always X.90). Auto-apply on import + on cost change. | Operators can't manually price 6,382 services. | Admin |
| AD-6 | **Provider Auto-Sync Cron** | Hourly job polls provider API → detects new services (auto-import with default markup), detects price changes (reprice per rules), detects provider outages (alert + auto-failover to backup provider). | Manual sync is unworkable. | Admin |
| AD-7 | **User Impersonation** | Admin clicks "Login as user" → sees their dashboard exactly as they do. Audit logged. Auto-expires after 30 min. | Standard support tool. | Admin (with audit log) |
| AD-8 | **Fraud Detection Rules** | Rule builder: "Flag user if: >3 chargebacks in 90d OR top-up velocity >$500 in 1h OR order link matches known-fraud-pattern OR shipping address country ≠ billing country". Auto-action: freeze, require KYC, alert Slack. | Chargebacks kill payment processor relationships. | Admin |
| AD-9 | **KYC / Identity Verification** | Integrate Stripe Identity / Persona / Sumsub. Required for withdrawals >$500. Status visible in user profile. | Reduces withdrawal fraud. | Admin |
| AD-10 | **Geographic & Cohort Analytics** | Map view of users by country. Cohort retention table (signup month × active months). Plan distribution. Funnel: signup → first top-up → first order → repeat order. | Operators need this to optimize growth. | Admin |
| AD-11 | **Feature Flags & Kill Switches** | Per-feature toggle (e.g. "disable marketplace sell tab for free users", "disable crypto withdrawals"). Per-segment rollout. Instant rollback. | Safety net for deploys. | Admin |
| AD-12 | **Maintenance Mode** | Toggle: "Block new orders, show banner, allow admin access". Schedule window. | Lets ops deploy safely. | Admin |
| AD-13 | **Announcements / Blog CMS** | Publish announcements (banner + dashboard card + email). Markdown editor. Schedule publish/unpublish. | Currently no way to communicate platform-wide. | Admin |
| AD-14 | **Email Campaign Manager** | Segment builder → compose → schedule → A/B test → analytics (opens, clicks, conversions). | Reactivation, upsell, newsletter. | Admin |
| AD-15 | **Currency Auto-Rate Sync** | Daily cron pulls FX from exchangerate.host / Open Exchange Rates → updates `Currency.rate`. Manual override allowed. | Currently manual rates drift from reality. | Admin |
| AD-16 | **Translation Management UI** | Edit i18n strings per language with context preview. Import/export JSON. Crowd-in-style suggestions. | Currently a code deploy to fix a typo. | Admin |
| AD-17 | **FAQ / Knowledge Base CMS** | Article editor with categories, tags, search analytics. Public-facing help center. | Reduces ticket volume 30-50%. | Admin |
| AD-18 | **Webhook Retry & Replay** | Click any failed webhook → "Retry" button. Delivery timeline (attempt N, status, response body). Auto-retry with exponential backoff (5 attempts). | Currently failed webhooks are lost. | Admin |
| AD-19 | **2FA Enforcement Policy** | Org-wide settings: "Require 2FA for admins", "Require 2FA for users with balance > $X", "Require 2FA for withdrawals > $Y". | Enterprise security expectation. | Admin |
| AD-20 | **Provider Health Alerts** | Slack/email/push on provider status change. Auto-failover: if Provider A is down >5 min, route new orders to Provider B for same service. | Currently a degraded provider silently fails orders. | Admin |
| AD-21 | **Payout Schedule Automation** | Configurable rules: "Auto-approve withdrawals under $50 with verified KYC and no chargebacks in 90d". Auto-reject: "Withdrawals to a new destination >$500 require manual review". | Reduces admin toil. | Admin |
| AD-22 | **Login History per User** | Drill-down in Customer 360: every login (timestamp, IP, country, device, browser). Detect account sharing. | Currently in AuditLog but not exposed per-user. | Admin |
| AD-23 | **Coupon Bulk Generator** | Generate N unique codes with shared config (discount, expiry, max uses). Export CSV. | Influencer/affiliate campaigns need bulk codes. | Admin |
| AD-24 | **Tax & Invoicing Config** | Per-user: tax ID, tax-exempt status, country. Auto-calc VAT on subscription invoices. Compliance reports. | EU expansion requires this. | Admin |
| AD-25 | **AB Testing Framework** | Define experiment (e.g. "Show drip-feed upsell on cart page"), traffic split, conversion metric. Analytics dashboard. | Conversion optimization. | Admin |
| AD-26 | **Backup & Restore UI** | Manual backup button + restore from timestamp. Cross-region replication status. | Currently DB backups are infra-only. | Admin |
| AD-27 | **IP Allowlist per Role** | "Admins can only log in from these IPs". Enterprise security requirement. | Enterprise sales blocker. | Admin |
| AD-28 | **Real-time Operator Dashboard** | Live tile grid: orders/min, revenue/min, top-ups/min, withdrawals pending, failed payments, error rate, p95 latency. Auto-refresh. Replaces the static overview stats. | Operators need live ops view. | Admin |

### 3.3 API premium features

| # | Feature | What | Why | Tier |
|---|---|---|---|---|
| AP-1 | **Full v1 API (12-20 endpoints)** | See gap list §2.5. | Resellers won't integrate without it. | All tiers (rate-limited by plan) |
| AP-2 | **Outbound Webhooks** | User registers URL + signed secret + event types → NOVSMM POSTs on order status change, balance change, ticket reply. | Replaces polling. Standard. | Growth+ |
| AP-3 | **Rate-limit Headers + Analytics** | `X-RateLimit-*` headers. Dashboard showing calls this month, error rate, quota. | Developer expectation. | All tiers |
| AP-4 | **Official SDKs** | JavaScript (`npm install novsmm`), Python (`pip install novsmm`), PHP (`composer require novsmm`). Auto-generated from OpenAPI. | Lowers integration friction 80%. | All tiers |
| AP-5 | **OAuth2** | For marketplace apps + third-party integrations. Scopes: `read:orders`, `write:orders`, `read:wallet`, etc. | Marketplace apps (Zapier, Make, n8n) need OAuth2. | Growth+ |
| AP-6 | **GraphQL Endpoint** | `POST /api/graphql` with full schema. | Trendy; some devs prefer it. | Enterprise |
| AP-7 | **Sandbox Mode + Test Keys** | `nvsk_test_*` keys that don't debit real balance. Mock fulfillment. | Devs need to test without spending money. | All tiers |
| AP-8 | **Idempotency Keys** | `Idempotency-Key` header on POST /orders prevents duplicate orders on retry. | Critical for unreliable networks. | All tiers |
| AP-9 | **Bulk Order API** | `POST /api/v1/orders/mass` accepts up to 100 orders in one request. Returns batch ID + per-order results. | Reseller automation. | Growth+ |
| AP-10 | **Public Interactive API Docs** | `docs.novsmm.com` with try-it-now playground, code snippets in 6 languages, copy-paste examples. | Developers evaluating the API need this. | Public |
| AP-11 | **API Changelog** | Versioned changelog with breaking-change migration guides. | Trust signal for developers. | Public |
| AP-12 | **Webhook Signature Verification Docs** | Code samples in 6 languages for verifying HMAC signatures. | Security expectation. | Public |

### 3.4 Landing Page premium features

| # | Feature | What | Why | Tier |
|---|---|---|---|---|
| LP-1 | **Interactive ROI Calculator** | "Buy at $X, resell at $Y, volume Z/wk → profit $N/wk, $M/mo, $K/yr". Slider inputs. | Converts resellers; surfaces the value prop. | Public |
| LP-2 | **Feature Comparison Matrix** | Side-by-side table: Free / Starter / Growth / Enterprise × ~30 features. Checkmarks, X marks, "—". | Buyers comparison-shop. | Public |
| LP-3 | **"NOVSMM vs Competitors" Comparison** | Table: NOVSMM vs JustAnotherPanel vs Peakerr vs SMMRaja. Columns: drip-feed, mass orders, real-time WS, multi-currency, white-label, API, etc. | Positions NOVSMM's advantages. | Public |
| LP-4 | **FAQ Section** | 15-20 Q&As covering pricing, payments, refunds, API, white-label, security, support. | Reduces sales emails; SEO. | Public |
| LP-5 | **Case Studies** | 3-6 detailed customer stories with metrics ("Acme Agency grew MRR 240% in 6 months with NOVSMM"). | Enterprise buyers want depth. | Public |
| LP-6 | **Blog / Content Hub** | SEO content: "How to start an SMM panel", "Best SMM strategies for 2024", etc. | Top-of-funnel traffic. | Public |
| LP-7 | **Changelog Page** | Public product updates. | Trust signal; shows velocity. | Public |
| LP-8 | **Public API Docs Portal** | Developer-focused sub-site with playground, SDKs, guides. | Developer evaluation. | Public |
| LP-9 | **Status Page** | `status.novsmm.com` with uptime history, incident history, component status, subscribe-to-updates. | Enterprise expectation. | Public |
| LP-10 | **Demo Video + Interactive Tour** | 60-sec hero video + "Take a 2-min tour" interactive walkthrough (no signup required). | Top-of-funnel conversion. | Public |
| LP-11 | **Affiliate Program Page** | Dedicated page for influencers: 10-20% commission, cookie window, marketing assets, payout schedule. | Influencer acquisition channel. | Public |
| LP-12 | **Partner Program Page** | For agencies/system integrators: listed in partner directory, co-marketing, referral fees. | B2B channel. | Public |
| LP-13 | **Press / Media Kit** | Logo assets, brand guidelines, founder bios, press releases, contact. | Press coverage enabler. | Public |
| LP-14 | **Careers Page** | Open roles, culture, benefits, application form. | Recruiting. | Public |
| LP-15 | **Terms / Privacy / Cookies / DPA / SLA Pages** | Real legal pages (currently toasts). | **Legal requirement.** | Public |
| LP-16 | **Live Chat Widget** | Intercom/Crisp-style live chat on landing + dashboard. | Premium plan promise. | Public |
| LP-17 | **Customer Logo Strip** | "Trusted by 184,500+ resellers, agencies, and enterprises" + logos. | B2B social proof. | Public |
| LP-18 | **Multi-Language Landing Toggle** | Render the landing in ES/PT/FR/DE based on browser locale or manual toggle. | LATAM/EU conversion lift. | Public |
| LP-19 | **Free Trial Flow** | "Start free" → no-card 14-day trial → in-app upgrade prompt when trial ends. | Currently no trial exists. | Public |
| LP-20 | **Interactive Pricing Slider** | "How many orders/mo do you place?" slider → recommends plan. | Self-qualification. | Public |

---

## 4. Competitive Differentiators (features no other SMM panel has)

These are the **leapfrog features** — things that would make NOVSMM famous in the industry and justify the $299/mo enterprise tier. Most SMM panels are stuck in 2018 (basic CRUD + cheap resold services). NOVSMM can leap to 2026 with:

### 4.1 AI-powered features

| # | Feature | What it does | Why no competitor has it |
|---|---|---|---|
| D-1 | **AI Service Recommender** | Natural-language order placement: "I want to make my TikTok about fitness look established to brands I'm pitching — what should I buy?" → AI suggests a multi-service bundle. | Competitors are CRUD apps with no AI infra. NOVSMM has the data + design layer to pull this off. |
| D-2 | **Engagement Fraud Detector** | After delivery, NOVSMM samples the delivered followers/likes and runs bot-detection (profile pic analysis, post frequency, follower ratios). Reports a "quality score" back to the user. Flags providers with high bot %. | No SMM panel exposes this — they're incented to hide it. NOVSMM can build trust by exposing it. |
| D-3 | **Smart Budget Allocator** | "I have $50/mo to grow this account" → AI splits across services based on the account's current state (low followers? start with followers. decent followers but low engagement? buy likes+comments). | Requires understanding growth strategy, not just selling services. |
| D-4 | **Predictive Drop-Rate Model** | ML model trained on historical delivery data predicts "this service will lose 12% of delivered followers in 30 days" — shown before purchase. | Requires data infrastructure competitors lack. |
| D-5 | **Auto-Refill Insurance** | Premium subscription add-on: if delivered count drops >5% within 60 days, NOVSMM auto-refills at no charge. Underwritten by the platform. | Competitors offer manual refill requests; none offer insured auto-refill. |
| D-6 | **AI Content Suggestions** | For organic growth complementing paid: AI suggests captions, hashtags, posting times based on the account's niche. | Bridges paid + organic — competitors only do paid. |
| D-7 | **Competitor Benchmarking** | "Track @competitor1, @competitor2" → NOVSMM shows their growth rate, engagement rate, and estimates their SMM spend. Suggests "you're under-investing in TikTok vs competitors". | Requires cross-account analytics competitors don't have. |

### 4.2 Marketplace & reseller innovations

| # | Feature | What it does | Why no competitor has it |
|---|---|---|---|
| D-8 | **Reseller Storefront Builder** | Reseller gets a white-labeled customer-facing storefront on their custom domain (e.g. `panel.acme.com`). Customers buy there; NOVSMM fulfills; reseller keeps margin. Zero code. | Competitors charge $500-5,000 for white-label scripts; NOVSMM can offer it as a $89/mo add-on. |
| D-9 | **Multi-Tier Reseller Hierarchy** | Reseller → Sub-Reseller → Customer. Margin splits auto-calculated. Sub-reseller sees only their customers. | Most panels support flat reseller only. Multi-tier unlocks viral growth. |
| D-10 | **Service Quality Leaderboard** | Public board ranking all services by 30-day drop rate, delivery speed, refill rate, customer rating. Top services get a "Verified Quality" badge. | Transparency no competitor offers. Builds marketplace trust. |
| D-11 | **Provider Transparency** | Show which provider fulfills each order + their historical stats (latency, completion %, drop %). Let users prefer/specific-block providers. | Competitors hide provider info. |
| D-12 | **Profit-Share for Top Resellers** | Top 1% resellers by volume get a % of platform revenue (not just their margin). Aligns incentives. | Loyalty play competitors can't match without scale. |
| D-13 | **Group Buying** | "Pool 10 buyers for 1M TikTok views at bulk price" — NOVSMM matches buyers, splits delivery. | No SMM panel does this. Borrowed from group-buy SEO tools. |
| D-14 | **Reseller Margin Optimizer** | AI suggests optimal resale price based on demand elasticity, competitor pricing, and your volume tier. "Drop price to $2.20 to win 18% more orders at 91% of margin." | Requires data + ML competitors lack. |

### 4.3 Agency & enterprise innovations

| # | Feature | What it does | Why no competitor has it |
| D-15 | **Client CRM Lite** | Agencies manage multiple client accounts inside NOVSMM. Per-client: budget, orders, reports, white-labeled PDF exports. One-click "switch client" context. | Competitors are reseller-only; no client-management layer. |
| D-16 | **Approval Workflows** | Junior agent places order → senior agent approves → order executes. Configurable per-client, per-amount. | Enterprise governance; competitors don't have. |
| D-17 | **White-Labeled Client Reports** | Auto-generated monthly PDF: "Your Instagram grew 12.4% this month, here's the breakdown." Branded with agency logo. | Agencies currently hand-build these in Canva. |
| D-18 | **Budget Alerts & Caps** | Per-client monthly budget cap. Alerts at 50%/80%/100%. Auto-pause orders at 100% unless override. | Prevents runaway spend; enterprises require. |
| D-19 | **Custom Pricing per Client** | Agency marks up services differently per client (Acme pays 1.5×, Beta pays 1.2×). | Agencies need flexible pricing competitors don't offer. |
| D-20 | **Content Calendar + Scheduled Publishing** | Beyond paid growth: schedule organic posts to Instagram/TikTok/etc. from NOVSMM. | Bridges paid + organic; competitor feature-gap. |
| D-21 | **Engagement Analytics Suite** | Beyond order metrics: track follower growth rate, engagement rate, reach, demographics, best posting times, hashtag performance. | SMM panels track orders, not outcomes. NOVSMM can track both. |
| D-22 | **Influencer Marketplace** | Connect brands with creators for paid sponsorships. NOVSMM takes a cut. | Adjacent marketplace; network-effect play. |
| D-23 | **Smart Link-in-Bio** | Like Linktree but with analytics + NOVSMM-order integration. Free tier drives signups. | Top-of-funnel acquisition tool. |
| D-24 | **Live Audience Polling** | Real-time poll widget for IG/TikTok live. Drives engagement. | Novelty feature for creators. |

### 4.4 Trust, security & compliance innovations

| # | Feature | What it does | Why no competitor has it |
| D-25 | **Refund Guarantee Badge** | Premium services carry a "100% refund if not delivered in 72h" badge. Funded by 2% service-price surcharge. | No competitor offers guaranteed refunds. |
| D-26 | **Loyalty Rewards Program** | Points per order (1 pt per $1). Redeem for credits, free services, or merch. Tier-based multipliers. | Retention play; SMM panels don't have. |
| D-27 | **Cashback on Volume** | Monthly rebate: place >$1K orders → 1% cashback; >$5K → 3%; >$10K → 5%. Auto-credited. | Volume retention. |
| D-28 | **Public Real-Time Status Page** | Not just `status.novsmm.com` — but a live order-flow visualization ("1,284 orders in flight, 4 regions, p95 1.4s"). | Trust signal; visual flex. |
| D-29 | **Bug Bounty Program** | Public HackerOne program. | Security signal for enterprise. |
| D-30 | **SOC 2 Type II + ISO 27001** | Actually get the certifications (currently the footer claims them). | Enterprise sales unlock. |

---

## 5. Implementation Priority — Top 10 Features to Build Next

Ranked by **(revenue impact × competitive parity necessity × implementation feasibility)**. These are the 10 features that, if shipped in the next 60-90 days, would close the biggest gaps with competitors and unlock the next tier of pricing.

### 🥇 #1 — Drip-Feed + Mass Order (P0, gap U-1 + U-2)
**Why:** Every SMM panel since 2018 has these. Power resellers literally cannot switch without them. Without these two features, NOVSMM cannot retain a paying reseller for more than a week.
**Spec:**
- Order modal: add "Drip-feed" toggle → reveals "Deliver over: X hours/days" + "Quantity per chunk" + randomization %
- New `POST /api/orders/mass` accepting up to 100 lines of `link, serviceId, qty` → batch-creates orders, returns batch ID + per-line results
- New dashboard route: `/dashboard/mass-order` with a textarea + CSV upload + preview table
- Schema: add `Order.parentBatchId` (nullable) to group mass-order lines
**Effort:** 3-5 days
**Unlocks:** Reseller plan adoption (Starter $29 → Growth $89 upgrade trigger)

### 🥈 #2 — Order Detail Drawer (P0, gap U-3)
**Why:** Currently clicking an order row does nothing. Users cannot see the link they bought, the provider, or the progress history. This is a fundamental UX gap.
**Spec:**
- Slide-in right drawer (500px) on order row click
- Sections: header (publicId, status pill, progress bar), link (with copy + open-in-new-tab), service snapshot, provider info + latency, fulfillment timeline (step-by-step with timestamps), profit margin (for resellers), invoice link, action buttons (Repeat, Refill if eligible, Cancel if within 60s)
- Mobile: full-screen sheet
**Effort:** 1-2 days
**Unlocks:** Trust + reduces "where's my order?" support tickets

### 🥉 #3 — Refill Request Button + Order Cancellation (P0, gaps U-4 + U-5)
**Why:** Standard SMM panel feature. Without refill, dropped followers = angry customers = chargebacks.
**Spec:**
- Completed orders within refill-eligible window (per-service config, default 30 days) show "Request refill" button
- `POST /api/orders/:id/refill` → validates eligibility, creates a new order at zero cost, links to parent
- Orders within 60s of placement show "Cancel" button → `POST /api/orders/:id/cancel` → refunds balance, marks order cancelled
- Admin config: per-service `refillWindowDays` + `refillAllowed` flag
**Effort:** 2-3 days
**Unlocks:** Trust, reduces chargebacks

### #4 — Self-Service API Keys + Outbound Webhooks (P1, gaps U-21 + U-22 + AP-2)
**Why:** Resellers building on top of NOVSMM need this. Without it, they integrate with competitors. This is the #1 dev-facing gap.
**Spec:**
- New "Developers" tab in user profile with: API key management (generate/revoke/rotate, scoped permissions), webhook management (register URL + event types + signed secret), API usage analytics (calls this month, error rate, top endpoints)
- `POST /api/me/api-keys`, `DELETE /api/me/api-keys/:id`, `GET /api/me/api-keys`
- `POST /api/me/webhooks`, `GET /api/me/webhooks`, `DELETE /api/me/webhooks/:id`
- Outbound webhook dispatcher: on order status change, fire signed POST to registered URLs (with retry + exponential backoff)
**Effort:** 4-5 days
**Unlocks:** Reseller developer lock-in, ecosystem growth

### #5 — Full v1 Public API (P0, gaps AP-1 through AP-15)
**Why:** Only 2 of 15 expected endpoints exist. Without a complete API, NOVSMM cannot be the backbone of any reseller's business.
**Spec:**
- Implement the 13 missing endpoints (see §2.5)
- Add rate-limit headers + per-plan quotas (free=100/hr, starter=1K/hr, growth=10K/hr, enterprise=unlimited)
- Add `Idempotency-Key` header support on POST /orders
- Generate OpenAPI spec automatically; publish to `/api/docs` + a new `docs.novsmm.com` portal
- Ship JavaScript + Python SDKs (auto-generated from OpenAPI)
**Effort:** 5-7 days
**Unlocks:** Developer ecosystem, enterprise sales

### #6 — Team Workspaces & Seat Invites (P1, gap U-20)
**Why:** Growth plan (10 seats) and Enterprise plan (100 seats) literally cannot use their seats today. This is a **paid-feature-not-delivered** legal risk.
**Spec:**
- New "Team" tab in profile: list current members, invite by email, assign role (owner/admin/billing/developer/viewer), revoke
- `POST /api/me/team/invite`, `DELETE /api/me/team/members/:id`, `PATCH /api/me/team/members/:id` (change role)
- Invited user gets email with magic link → onboarding → joins workspace
- Permission enforcement: billing role can top up but not place orders; developer role can manage API keys but not see balance; etc.
- Schema: new `TeamMember` model (userId, workspaceId, role, invitedAt, joinedAt)
**Effort:** 4-5 days
**Unlocks:** Growth + Enterprise plan value delivered

### #7 — Admin Customer 360 + Transactions Tab (P0, gaps A-1 + A-2)
**Why:** Currently the admin can't see a single user's full picture. Support is impossible without this.
**Spec:**
- New admin "Customers" tab (rename "Users"): searchable, filterable (by plan, by status, by signup date, by balance range)
- Click user → Customer 360 page: profile card, balance breakdown, order history (filterable), transaction history, tickets, sessions, audit log, KYC status, IP history, lifetime value, churn risk score
- New admin "Transactions" tab: searchable, filterable (by type, method, date, amount, user), export to CSV, reconcile against provider settlements
**Effort:** 4-5 days
**Unlocks:** Operator efficiency, faster support

### #8 — Email Verification Enforcement + Password Reset UI (P0, gaps Au-1 + Au-2)
**Why:** Legal/security risk. Users can transact with unverified emails. Password reset emails link to a URL the SPA doesn't handle.
**Spec:**
- After register: user is "pending" until email verified (cannot place orders, cannot withdraw, can browse marketplace)
- Send verification email with link `/?verify=<token>` → SPA parses token → calls `/api/auth/verify-email` → on success, user becomes "active"
- Forgot password: existing modal sends email with `/?reset=<token>` → SPA renders reset-password form → calls `/api/auth/reset-password`
- Add banner: "Please verify your email" with resend button
**Effort:** 2 days
**Unlocks:** Reduced bounce rate, reduced fraud, GDPR compliance

### #9 — AI Service Recommender (Differentiator D-1 + UD-1)
**Why:** First AI feature. Differentiator no competitor has. Justifies the Growth+ upsell. Marketing-friendly ("NOVSMM is the first AI-powered SMM panel").
**Spec:**
- New "AI Assistant" floating button bottom-right (above WhatsApp widget)
- Opens chat-style interface: user types goal in natural language ("I want to make my fitness TikTok look established for brand deals")
- AI (Claude/GPT-4 via API) parses intent → queries services catalog with filters → returns top 3 service bundles with reasoning + price estimate + drip-feed recommendation
- One-click "Order bundle" creates multiple orders in sequence
- Train on historical order success data (which services actually delivered)
**Effort:** 5-7 days (includes prompt engineering + UI)
**Unlocks:** Growth+ upsell, marketing differentiation

### #10 — Real-Time Order Tracking Page + PWA + Web Push (P1, gaps U-23 + UD-11 enhancements)
**Why:** The WebSocket infra exists but isn't used for the #1 thing users want: live order progress. PWA + push notifications make NOVSMM feel like a native app.
**Spec:**
- New `/dashboard/orders/:id` route: full-screen live tracking page with WebSocket-driven progress bar, step-by-step timeline, ETA countdown, provider status
- PWA manifest + service worker: installable on iOS/Android, works offline for cached views
- Web Push notifications (via VAPID keys): order completed, order failed, low balance, withdrawal processed — even when NOVSMM tab is closed
- Settings: per-event push notification preferences (extend existing notification-preferences API)
**Effort:** 5-7 days
**Unlocks:** Mobile retention, "app-like" feel, premium perception

---

## Appendix A — Audit Method

This audit was performed by reading:
- `worklog.md` (1,793 lines — full project history)
- `audit-report.md` (existing UI→API connection audit, 700 lines)
- `prisma/schema.prisma` (515 lines — 22 data models)
- All 41 components in `src/components/novsmm/` (~13,270 lines)
- All 71 API route files in `src/app/api/` (~7,435 lines)
- All 16 admin tabs in `admin-panel.tsx` (2,603 lines)

No source files were modified. The audit was conducted in a single read-only pass.

## Appendix B — Feature Inventory (current state)

### Landing page (9 sections)
- ✅ Hero (parallax bg, floating chips, dashboard preview)
- ✅ Services (11 platform cards + aggregate)
- ✅ Marketplace (flow diagram + offers board)
- ✅ Payments (4 method cards + floating coins)
- ✅ Stats (4 counters + bar chart + uptime bars)
- ✅ Testimonials (dual marquee)
- ✅ Plans (3 tiers, monthly/yearly toggle)
- ✅ Security (radar sweep + 8 layer cards)
- ✅ Footer (CTA + link grid + giant wordmark)

### Auth flows (5)
- ✅ Login (credentials + 4 social buttons; Google/Discord wired, Telegram/Apple "coming soon")
- ✅ Register (8 fields, password strength, locale selectors)
- ✅ Forgot password (modal → email link)
- ⚠️ Reset password (endpoint exists, no UI consumer for the link)
- ⚠️ Email verification (endpoint exists, not enforced)
- ✅ 2FA setup/verify/disable (TOTP)
- ✅ Onboarding (6 steps)

### User dashboard (8 tabs)
- ✅ Home (4 stats, revenue chart, wallet card, recent orders, favorites, tickets)
- ✅ Analytics (4 KPIs, revenue+orders area chart, marketplace pie, hourly bar, referrals line)
- ✅ Marketplace (Buy/Sell/History with infinite scroll, coupon apply, repeat order)
- ✅ Orders (filterable table, CSV export, repeat)
- ✅ Wallet (3 balance cards, cash flow chart, top-up modal, withdraw modal, transaction table, CSV export)
- ✅ Tickets (2-pane chat UI, attachments, create new)
- ✅ Notifications (WebSocket live feed, 9 type filters, mark-all-read)
- ✅ Profile (6 sub-sections: profile, security, billing, referrals, notifications, sessions)

### Admin panel (17 tabs)
- ✅ Overview (stats, 30d revenue chart, system health, broadcast composer)
- ✅ Users (search, bulk select, suspend/activate/promote)
- ✅ Orders (admin view + manual order creation)
- ✅ Services (CRUD with edit/delete modals)
- ✅ Providers (CRUD with edit modal + sync button)
- ✅ Payments (method cards + credentials modal + test connection)
- ✅ Promotions (CRUD with edit modal)
- ✅ Withdrawals (approve/reject pending)
- ✅ Refunds (refund any completed transaction)
- ✅ API Keys (generate/revoke with copy-once banner)
- ✅ Licenses (issue/suspend/activate with copy-once banner)
- ✅ Currencies (add/toggle)
- ✅ Languages (add/toggle)
- ✅ Webhooks (read-only log)
- ✅ Settings (9 platform-wide settings)
- ✅ Security (decorative layer cards + recent audit logs)
- ✅ Roles (create/edit/delete with permission matrix)

### API surface (71 route files, 88 handlers)
- ✅ Auth (5): register, forgot/reset password, verify email, NextAuth
- ✅ User (10): dashboard, me, password, 2FA (×3), sessions, notification-prefs, language
- ✅ Orders (2): list/create, repeat
- ✅ Wallet (3): balance, topup, withdraw
- ✅ Services (2): list, detail
- ✅ Notifications (1): list, mark-all-read
- ✅ Tickets (1): CRUD
- ✅ Uploads (1): multipart file attach
- ✅ Analytics (1)
- ✅ Favorites (1)
- ✅ Offers (1): marketplace sell
- ✅ Subscriptions (2): subscribe/cancel, seats
- ✅ Invoices (1)
- ✅ Referrals (1)
- ✅ Coupons (1): validate
- ✅ Export (1): CSV
- ✅ Status (1)
- ✅ Docs (1): OpenAPI
- ✅ Payment-methods (1)
- ✅ Admin (22): overview, users, services, providers (+sync), payment-methods (+test), orders (manual), refunds, bulk, coupons, promotions, withdrawals, api-keys, licenses, currencies, languages, webhooks, logs (CSV), settings, notifications (broadcast), roles, search
- ✅ Public (4): settings, validate-license, currencies, languages
- ✅ v1 API (2): services, orders
- ✅ Webhooks (3 inbound): stripe, mercadopago, nowpayments

---

**End of audit.**
