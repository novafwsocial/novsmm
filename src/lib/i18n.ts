/**
 * NOVSMM i18n translations.
 * Each language has a set of translation keys for common UI strings.
 * Missing keys fall back to English.
 *
 * Languages: en, es, pt, fr
 *
 * ADMIN-FIX-BATCH-2: German ("de") was removed because no translation pack
 * exists for it. Re-add only when a complete `de` translation object ships.
 */

export type TranslationKey =
  // Landing — Navbar
  | "landing.nav.platform"
  | "landing.nav.services"
  | "landing.nav.marketplace"
  | "landing.nav.payments"
  | "landing.nav.security"
  | "landing.nav.pricing"
  | "landing.nav.signIn"
  | "landing.nav.startFree"
  | "landing.nav.dashboard"
  // Landing — Hero
  | "landing.hero.badge"
  | "landing.hero.title"
  | "landing.hero.titleHighlight"
  | "landing.hero.titleEnd"
  | "landing.hero.subtitle"
  | "landing.hero.startFree"
  | "landing.hero.viewPricing"
  | "landing.hero.signIn"
  | "landing.hero.noCardRequired"
  | "landing.hero.uptimeSLA"
  | "landing.hero.soc2"
  // Landing — Footer
  | "landing.footer.tagline"
  | "landing.footer.startFree"
  | "landing.footer.signIn"
  | "landing.footer.availableIn"
  | "landing.footer.copyright"
  | "landing.footer.privacyFirst"
  | "landing.footer.platform"
  | "landing.footer.solutions"
  | "landing.footer.company"
  | "landing.footer.resources"
  | "landing.footer.resellers"
  | "landing.footer.agencies"
  | "landing.footer.enterprises"
  | "landing.footer.creators"
  | "landing.footer.wholesale"
  | "landing.footer.affiliates"
  | "landing.footer.about"
  | "landing.footer.careers"
  | "landing.footer.press"
  | "landing.footer.partners"
  | "landing.footer.contact"
  | "landing.footer.status"
  | "landing.footer.docs"
  | "landing.footer.apiRef"
  | "landing.footer.changelog"
  | "landing.footer.security"
  | "landing.footer.legal"
  | "landing.footer.dashboard"
  | "landing.footer.payments"
  | "landing.footer.analytics"
  | "landing.footer.api"
  | "landing.footer.terms"
  | "landing.footer.privacy"
  | "landing.footer.cookies"
  // Dashboard (existing)
  | "dashboard.welcome"
  | "dashboard.balance"
  | "dashboard.activeOrders"
  | "dashboard.completedOrders"
  | "dashboard.revenue"
  | "marketplace.title"
  | "marketplace.buy"
  | "marketplace.sell"
  | "marketplace.history"
  | "marketplace.search"
  | "marketplace.perThousand"
  | "marketplace.placeOrder"
  | "marketplace.viewDetails"
  | "wallet.title"
  | "wallet.topUp"
  | "wallet.withdraw"
  | "wallet.available"
  | "wallet.held"
  | "wallet.transactions"
  | "orders.title"
  | "orders.all"
  | "orders.processing"
  | "orders.completed"
  | "orders.repeat"
  | "orders.export"
  | "tickets.title"
  | "tickets.new"
  | "tickets.subject"
  | "tickets.message"
  | "tickets.send"
  | "notifications.title"
  | "notifications.markAllRead"
  | "notifications.live"
  | "profile.title"
  | "profile.currency"
  | "profile.language"
  | "profile.save"
  | "auth.signIn"
  | "auth.signUp"
  | "auth.signOut"
  | "auth.email"
  | "auth.password"
  | "auth.forgotPassword"
  | "common.loading"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.search"
  | "common.actions"
  | "common.status"
  // Landing — Services
  | "landing.services.eyebrow"
  | "landing.services.titleLine1"
  | "landing.services.titleLine2"
  | "landing.services.description"
  | "landing.services.moreLabel"
  | "landing.services.totalServices"
  | "landing.services.svcUnit"
  // Landing — Marketplace
  | "landing.marketplace.eyebrow"
  | "landing.marketplace.titleLine1"
  | "landing.marketplace.titleLine2"
  | "landing.marketplace.description"
  | "landing.marketplace.flow.label"
  | "landing.marketplace.flow.title"
  | "landing.marketplace.flow.supply.title"
  | "landing.marketplace.flow.supply.desc"
  | "landing.marketplace.flow.supply.chip"
  | "landing.marketplace.flow.markup.title"
  | "landing.marketplace.flow.markup.desc"
  | "landing.marketplace.flow.markup.chip"
  | "landing.marketplace.flow.checkout.title"
  | "landing.marketplace.flow.checkout.desc"
  | "landing.marketplace.flow.checkout.chip"
  | "landing.marketplace.flow.settlement.title"
  | "landing.marketplace.flow.settlement.desc"
  | "landing.marketplace.flow.settlement.chip"
  | "landing.marketplace.flow.loopback"
  | "landing.marketplace.offers.label"
  | "landing.marketplace.offers.title"
  | "landing.marketplace.offers.statusLive"
  | "landing.marketplace.offers.statusSample"
  | "landing.marketplace.offers.sampleNotice"
  | "landing.marketplace.offers.cost"
  | "landing.marketplace.offers.retail"
  | "landing.marketplace.offers.sold"
  | "landing.marketplace.offers.walletLabel"
  | "landing.marketplace.offers.withdraw"
  // Landing — Payments
  | "landing.payments.eyebrow"
  | "landing.payments.titleLine1"
  | "landing.payments.titleLine2"
  | "landing.payments.description"
  | "landing.payments.metaCurrencies"
  | "landing.payments.metaSettlement"
  | "landing.payments.metaSecurity"
  | "landing.payments.statGateways"
  | "landing.payments.statCurrencies"
  | "landing.payments.statFailure"
  | "landing.payments.statSettlement"
  | "landing.payments.coinFieldLabel"
  | "landing.payments.provider.paypal.note"
  | "landing.payments.provider.paypal.coverage"
  | "landing.payments.provider.mercadopago.note"
  | "landing.payments.provider.mercadopago.coverage"
  | "landing.payments.provider.nowpayments.note"
  | "landing.payments.provider.nowpayments.coverage"
  | "landing.payments.provider.manual.note"
  | "landing.payments.provider.manual.coverage"
  | "landing.payments.settlement.instant"
  | "landing.payments.settlement.onchain"
  | "landing.payments.settlement.hours"
  | "landing.payments.security.pciL1"
  | "landing.payments.security.decentralized"
  | "landing.payments.security.verified"
  // Landing — Stats
  | "landing.stats.eyebrow"
  | "landing.stats.titleLine1"
  | "landing.stats.titleLine2"
  | "landing.stats.description"
  | "landing.stats.orders.label"
  | "landing.stats.orders.sub"
  | "landing.stats.users.label"
  | "landing.stats.users.sub"
  | "landing.stats.revenue.label"
  | "landing.stats.revenue.sub"
  | "landing.stats.enterprise.label"
  | "landing.stats.enterprise.sub"
  | "landing.stats.chart.label"
  | "landing.stats.chart.dod"
  | "landing.stats.status.label"
  | "landing.stats.status.state"
  | "landing.stats.status.uptimeLabel"
  | "landing.stats.status.60daysAgo"
  | "landing.stats.status.today"
  | "landing.stats.status.avgStart"
  | "landing.stats.status.throughput"
  | "landing.stats.status.perMin"
  // Landing — Testimonials
  | "landing.testimonials.eyebrow"
  | "landing.testimonials.titleLine1"
  | "landing.testimonials.titleLine2"
  | "landing.testimonials.description"
  | "landing.testimonials.verifiedBy"
  | "landing.testimonials.proof.avgRating"
  | "landing.testimonials.proof.nps"
  | "landing.testimonials.proof.switchedFrom"
  | "landing.testimonials.proof.countries"
  // Landing — Security
  | "landing.security.eyebrow"
  | "landing.security.titleLine1"
  | "landing.security.titleLine2"
  | "landing.security.description"
  | "landing.security.statusActive"
  | "landing.security.layer.ddos.title"
  | "landing.security.layer.ddos.desc"
  | "landing.security.layer.ddos.metric"
  | "landing.security.layer.tls.title"
  | "landing.security.layer.tls.desc"
  | "landing.security.layer.tls.metric"
  | "landing.security.layer.aes.title"
  | "landing.security.layer.aes.desc"
  | "landing.security.layer.aes.metric"
  | "landing.security.layer.backups.title"
  | "landing.security.layer.backups.desc"
  | "landing.security.layer.backups.metric"
  | "landing.security.layer.ha.title"
  | "landing.security.layer.ha.desc"
  | "landing.security.layer.ha.metric"
  | "landing.security.layer.api.title"
  | "landing.security.layer.api.desc"
  | "landing.security.layer.api.metric"
  | "landing.security.layer.audit.title"
  | "landing.security.layer.audit.desc"
  | "landing.security.layer.audit.metric"
  | "landing.security.layer.auth.title"
  | "landing.security.layer.auth.desc"
  | "landing.security.layer.auth.metric"
  | "landing.security.shield.edge"
  | "landing.security.shield.app"
  | "landing.security.shield.data"
  | "landing.security.shield.keys"
  | "landing.security.metric.threats"
  | "landing.security.metric.mttr"
  | "landing.security.metric.regions"
  // Landing — API Docs
  | "landing.apiDocs.eyebrow"
  | "landing.apiDocs.titleLine1"
  | "landing.apiDocs.titleLine2"
  | "landing.apiDocs.description"
  | "landing.apiDocs.compatNote"
  | "landing.apiDocs.whatYouGet"
  | "landing.apiDocs.everythingYouNeed"
  | "landing.apiDocs.feature.endpoints.title"
  | "landing.apiDocs.feature.endpoints.desc"
  | "landing.apiDocs.feature.batching.title"
  | "landing.apiDocs.feature.batching.desc"
  | "landing.apiDocs.feature.dripFeed.title"
  | "landing.apiDocs.feature.dripFeed.desc"
  | "landing.apiDocs.feature.refill.title"
  | "landing.apiDocs.feature.refill.desc"
  | "landing.apiDocs.feature.webhooks.title"
  | "landing.apiDocs.feature.webhooks.desc"
  | "landing.apiDocs.feature.keys.title"
  | "landing.apiDocs.feature.keys.desc"
  | "landing.apiDocs.viewDocs"
  | "landing.apiDocs.versionNote"
  // Landing — Affiliates
  | "landing.affiliates.eyebrow"
  | "landing.affiliates.titleLine1"
  | "landing.affiliates.titleLine2"
  | "landing.affiliates.description"
  | "landing.affiliates.stats.affiliates"
  | "landing.affiliates.stats.paidOut"
  | "landing.affiliates.stats.commission"
  | "landing.affiliates.commission.label"
  | "landing.affiliates.commission.title"
  | "landing.affiliates.commission.yourShare"
  | "landing.affiliates.commission.theirOrder"
  | "landing.affiliates.commission.customerOrder"
  | "landing.affiliates.commission.example"
  | "landing.affiliates.payout.label"
  | "landing.affiliates.payout.wallet.label"
  | "landing.affiliates.payout.wallet.note"
  | "landing.affiliates.payout.paypal.note"
  | "landing.affiliates.payout.usdt.note"
  | "landing.affiliates.howItWorks.label"
  | "landing.affiliates.howItWorks.title"
  | "landing.affiliates.step1.title"
  | "landing.affiliates.step1.desc"
  | "landing.affiliates.step2.title"
  | "landing.affiliates.step2.desc"
  | "landing.affiliates.step3.title"
  | "landing.affiliates.step3.desc"
  | "landing.affiliates.cta.become"
  | "landing.affiliates.cta.openDashboard"
  | "landing.affiliates.cta.note"
  // Landing — FAQ
  | "landing.faq.eyebrow"
  | "landing.faq.title"
  | "landing.faq.description"
  | "landing.faq.stillHaveQuestions"
  | "landing.faq.supportReplies"
  | "landing.faq.chatWithUs"
  // Landing — Sticky CTA
  | "landing.stickyCta.title"
  | "landing.stickyCta.subtitle"
  | "landing.stickyCta.getStarted"
  | "landing.stickyCta.viewPricing"
  | "landing.stickyCta.startFree"
  // Landing — Social Proof
  | "landing.socialProof.demo"
  | "landing.socialProof.action.signedUp"
  | "landing.socialProof.action.placedOrder"
  | "landing.socialProof.action.toppedUp"
  | "landing.socialProof.ariaLabel"
  | "landing.socialProof.dismiss";

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  // Landing — Navbar
  "landing.nav.platform": "Platform",
  "landing.nav.services": "Services",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Payments",
  "landing.nav.security": "Security",
  "landing.nav.pricing": "Pricing",
  "landing.nav.signIn": "Sign in",
  "landing.nav.startFree": "Start free",
  "landing.nav.dashboard": "Dashboard",
  // Landing — Hero
  "landing.hero.badge": "Now processing",
  "landing.hero.title": "The infrastructure for",
  "landing.hero.titleHighlight": "social media marketing",
  "landing.hero.titleEnd": "at scale.",
  "landing.hero.subtitle": "NOVSMM unifies order automation, a reseller marketplace, and payments into one platform — engineered for teams that ship at the speed of attention.",
  "landing.hero.startFree": "Start free",
  "landing.hero.viewPricing": "View pricing",
  "landing.hero.signIn": "Sign in",
  "landing.hero.noCardRequired": "No credit card required",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "SOC 2 controls",
  // Landing — Footer
  "landing.footer.tagline": "Ship at the speed of attention.",
  "landing.footer.startFree": "Start free",
  "landing.footer.signIn": "Sign in",
  "landing.footer.availableIn": "Available in 60+ countries · 12 currencies · 24/7 support",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Privacy-first · Secure by design",
  "landing.footer.platform": "Platform",
  "landing.footer.solutions": "Solutions",
  "landing.footer.company": "Company",
  "landing.footer.resources": "Resources",
  "landing.footer.resellers": "Resellers",
  "landing.footer.agencies": "Agencies",
  "landing.footer.enterprises": "Enterprises",
  "landing.footer.creators": "Creators",
  "landing.footer.wholesale": "Wholesale",
  "landing.footer.affiliates": "Affiliates",
  "landing.footer.about": "About",
  "landing.footer.careers": "Careers",
  "landing.footer.press": "Press",
  "landing.footer.partners": "Partners",
  "landing.footer.contact": "Contact",
  "landing.footer.status": "Status",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "API reference",
  "landing.footer.changelog": "Changelog",
  "landing.footer.security": "Security",
  "landing.footer.legal": "Legal",
  "landing.footer.dashboard": "Dashboard",
  "landing.footer.payments": "Payments",
  "landing.footer.analytics": "Analytics",
  "landing.footer.api": "API",
  "landing.footer.terms": "Terms",
  "landing.footer.privacy": "Privacy",
  "landing.footer.cookies": "Cookies",
  // Landing — Services
  "landing.services.eyebrow": "Services",
  "landing.services.titleLine1": "Every platform. Every metric.",
  "landing.services.titleLine2": "One control surface.",
  "landing.services.description": "From follower growth to watch-time, NOVSMM orchestrates 6,300+ services across the platforms your audience actually lives on — powered by HuntSMM.",
  "landing.services.moreLabel": "+ more",
  "landing.services.totalServices": "total active services",
  "landing.services.svcUnit": "svc",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Buy wholesale. Resell at your price.",
  "landing.marketplace.titleLine2": "Keep the margin.",
  "landing.marketplace.description": "An open marketplace where resellers compete on price, publish their own offers, and watch profit settle in real time — without touching infrastructure.",
  "landing.marketplace.flow.label": "The flow",
  "landing.marketplace.flow.title": "From supply to settled profit in one continuous loop",
  "landing.marketplace.flow.supply.title": "Provider supply",
  "landing.marketplace.flow.supply.desc": "Approved providers list services at wholesale rates.",
  "landing.marketplace.flow.supply.chip": "wholesale",
  "landing.marketplace.flow.markup.title": "Reseller markup",
  "landing.marketplace.flow.markup.desc": "Set margins per service, per client tier, per currency.",
  "landing.marketplace.flow.markup.chip": "your margin",
  "landing.marketplace.flow.checkout.title": "Buyer checkout",
  "landing.marketplace.flow.checkout.desc": "Customers buy at your retail price across 5 gateways.",
  "landing.marketplace.flow.checkout.chip": "retail",
  "landing.marketplace.flow.settlement.title": "Instant settlement",
  "landing.marketplace.flow.settlement.desc": "Profit settles to your wallet the moment an order starts.",
  "landing.marketplace.flow.settlement.chip": "profit",
  "landing.marketplace.flow.loopback": "Profit recycles into balance — fund the next order instantly.",
  "landing.marketplace.offers.label": "Live offers board",
  "landing.marketplace.offers.title": "Compete on price. Win the order.",
  "landing.marketplace.offers.statusLive": "live",
  "landing.marketplace.offers.statusSample": "sample",
  "landing.marketplace.offers.sampleNotice": "Showing sample offers — publish your own from the dashboard to populate the live board.",
  "landing.marketplace.offers.cost": "cost",
  "landing.marketplace.offers.retail": "retail",
  "landing.marketplace.offers.sold": "sold",
  "landing.marketplace.offers.walletLabel": "Wallet balance",
  "landing.marketplace.offers.withdraw": "Withdraw",
  // Landing — Payments
  "landing.payments.eyebrow": "Payments",
  "landing.payments.titleLine1": "One balance. Every currency.",
  "landing.payments.titleLine2": "Settled in minutes.",
  "landing.payments.description": "NOVSMM routes every transaction through PayPal, Mercado Pago, NowPayments (crypto), or manual settlement — with FX conversion at mid-market rates and 100+ cryptocurrencies accepted.",
  "landing.payments.metaCurrencies": "Cur.",
  "landing.payments.metaSettlement": "Settle",
  "landing.payments.metaSecurity": "Sec.",
  "landing.payments.statGateways": "Payment gateways",
  "landing.payments.statCurrencies": "Currencies",
  "landing.payments.statFailure": "Failure rate",
  "landing.payments.statSettlement": "Avg. settlement",
  "landing.payments.coinFieldLabel": "Reactive to scroll & cursor · GPU accelerated",
  "landing.payments.provider.paypal.note": "Buyer protection & vaulted wallets. Trusted globally.",
  "landing.payments.provider.paypal.coverage": "200+ countries",
  "landing.payments.provider.mercadopago.note": "Leading payment platform in Latin America. Local rails.",
  "landing.payments.provider.mercadopago.coverage": "LATAM region",
  "landing.payments.provider.nowpayments.note": "Accept 100+ cryptocurrencies. Auto-conversion to fiat. Zero chargebacks.",
  "landing.payments.provider.nowpayments.coverage": "Global",
  "landing.payments.provider.manual.note": "Contact our team via WhatsApp for manual credits. Zero fees.",
  "landing.payments.provider.manual.coverage": "Global",
  "landing.payments.settlement.instant": "Instant",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (via provider)",
  "landing.payments.security.decentralized": "Decentralized",
  "landing.payments.security.verified": "Verified",
  // Landing — Stats
  "landing.stats.eyebrow": "Statistics",
  "landing.stats.titleLine1": "Numbers that move",
  "landing.stats.titleLine2": "at the speed of attention.",
  "landing.stats.description": "Every counter below is wired to the same telemetry that powers operator dashboards — updated continuously, never cached for vanity.",
  "landing.stats.orders.label": "Orders fulfilled",
  "landing.stats.orders.sub": "all-time, across {count} services",
  "landing.stats.users.label": "Active users",
  "landing.stats.users.sub": "resellers & agencies, 30d",
  "landing.stats.revenue.label": "Revenue routed",
  "landing.stats.revenue.sub": "through the marketplace",
  "landing.stats.enterprise.label": "Enterprise clients",
  "landing.stats.enterprise.sub": "with dedicated infra",
  "landing.stats.chart.label": "Daily sales · last 14 days",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "System status",
  "landing.stats.status.state": "operational",
  "landing.stats.status.uptimeLabel": "uptime, trailing 90d",
  "landing.stats.status.60daysAgo": "60 days ago",
  "landing.stats.status.today": "today",
  "landing.stats.status.avgStart": "Avg. start",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Testimonials",
  "landing.testimonials.titleLine1": "Operators who switched.",
  "landing.testimonials.titleLine2": "Results that stayed.",
  "landing.testimonials.description": "Representative experiences from platform users. Results may vary.",
  "landing.testimonials.verifiedBy": "Verified by NOVSMM operators",
  "landing.testimonials.proof.avgRating": "Average rating",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Switched from",
  "landing.testimonials.proof.countries": "Countries served",
  // Landing — Security
  "landing.security.eyebrow": "Security",
  "landing.security.titleLine1": "Security you can see —",
  "landing.security.titleLine2": "not just a checklist.",
  "landing.security.description": "Every layer below is instrumented, monitored, and surfaced live to operators. This is the posture enterprise teams require.",
  "landing.security.statusActive": "active",
  "landing.security.layer.ddos.title": "DDoS shielding",
  "landing.security.layer.ddos.desc": "Always-on L3/L4/L7 mitigation at the edge. 2.4 Tbps capacity.",
  "landing.security.layer.ddos.metric": "0 attacks breached",
  "landing.security.layer.tls.title": "TLS 1.3 everywhere",
  "landing.security.layer.tls.desc": "End-to-end encryption in transit. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "A+ rating · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 at rest",
  "landing.security.layer.aes.desc": "All wallets, keys, and PII encrypted with per-tenant DEKs.",
  "landing.security.layer.aes.metric": "FIPS 140-2 modules",
  "landing.security.layer.backups.title": "Continuous backups",
  "landing.security.layer.backups.desc": "PITR every 60s, cross-region replicas, 30-day retention.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "High availability",
  "landing.security.layer.ha.desc": "Active-active across 3 regions. Auto-failover under 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "API protection",
  "landing.security.layer.api.desc": "Per-key rate limits, anomaly detection, signed webhooks.",
  "landing.security.layer.api.metric": "<0.01% bad requests",
  "landing.security.layer.audit.title": "Audit logs",
  "landing.security.layer.audit.desc": "Immutable, exportable logs for every privileged action.",
  "landing.security.layer.audit.metric": "12-month retention",
  "landing.security.layer.auth.title": "Secure auth",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, hardware keys. SCIM provisioning.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Data",
  "landing.security.shield.keys": "Keys",
  "landing.security.metric.threats": "Threats blocked",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Regions",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "Developer API",
  "landing.apiDocs.titleLine1": "Build with the",
  "landing.apiDocs.titleLine2": "NOVSMM API.",
  "landing.apiDocs.description": "A PerfectPanel / JAP-compatible REST contract — drop-in compatible with your existing bots, panels, and automation tooling. Bearer auth, scoped keys, signed webhooks.",
  "landing.apiDocs.compatNote": "Compatible with existing SMM panel tooling — no SDK install required.",
  "landing.apiDocs.whatYouGet": "What you get",
  "landing.apiDocs.everythingYouNeed": "Everything a reseller integration needs",
  "landing.apiDocs.feature.endpoints.title": "7 REST endpoints",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — full coverage.",
  "landing.apiDocs.feature.batching.title": "Multi-order batching",
  "landing.apiDocs.feature.batching.desc": "Submit up to 100 orders in a single request. Atomic failure, partial success.",
  "landing.apiDocs.feature.dripFeed.title": "Drip-feed scheduling",
  "landing.apiDocs.feature.dripFeed.desc": "Split delivery into chunks with configurable runs and intervals.",
  "landing.apiDocs.feature.refill.title": "Refill requests",
  "landing.apiDocs.feature.refill.desc": "Trigger re-delivery on completed orders when counts drop within 30 days.",
  "landing.apiDocs.feature.webhooks.title": "Signed webhooks",
  "landing.apiDocs.feature.webhooks.desc": "HMAC-signed events for order status changes — replay-safe and idempotent.",
  "landing.apiDocs.feature.keys.title": "Scoped API keys",
  "landing.apiDocs.feature.keys.desc": "Per-key permissions: read, order, wallet, marketplace. Rotate without downtime.",
  "landing.apiDocs.viewDocs": "View full API docs",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min per key",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Affiliates",
  "landing.affiliates.titleLine1": "Earn 10% commission",
  "landing.affiliates.titleLine2": "on every referral.",
  "landing.affiliates.description": "Lifetime attribution, real-time payouts, no caps. The NOVSMM affiliate program is the highest-paying referral system in the SMM ecosystem.",
  "landing.affiliates.stats.affiliates": "affiliates earning today",
  "landing.affiliates.stats.paidOut": "paid out to affiliates",
  "landing.affiliates.stats.commission": "lifetime commission",
  "landing.affiliates.commission.label": "Commission structure",
  "landing.affiliates.commission.title": "10% lifetime · $50 minimum payout",
  "landing.affiliates.commission.yourShare": "Your share",
  "landing.affiliates.commission.theirOrder": "Their order",
  "landing.affiliates.commission.customerOrder": "customer order",
  "landing.affiliates.commission.example": "Example: a $100 order credits you {amount} — instantly, every time, forever.",
  "landing.affiliates.payout.label": "Payout methods",
  "landing.affiliates.payout.wallet.label": "Wallet balance",
  "landing.affiliates.payout.wallet.note": "Instant · no fees",
  "landing.affiliates.payout.paypal.note": "$50 minimum",
  "landing.affiliates.payout.usdt.note": "$50 minimum",
  "landing.affiliates.howItWorks.label": "How it works",
  "landing.affiliates.howItWorks.title": "Three steps to forever income",
  "landing.affiliates.step1.title": "Share your link",
  "landing.affiliates.step1.desc": "Get a unique referral link from your dashboard. Post it anywhere — Twitter, Telegram, your panel footer.",
  "landing.affiliates.step2.title": "They sign up & order",
  "landing.affiliates.step2.desc": "Anyone who registers through your link is tagged as your referral — for life. No attribution windows.",
  "landing.affiliates.step3.title": "You earn 10% forever",
  "landing.affiliates.step3.desc": "Every order they place earns you 10% commission — credited to your wallet in real time, withdrawable any time.",
  "landing.affiliates.cta.become": "Become an affiliate",
  "landing.affiliates.cta.openDashboard": "Open your referral dashboard",
  "landing.affiliates.cta.note": "No approval process · Instant activation · Withdraw anytime",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Frequently asked questions",
  "landing.faq.description": "Answers to the most common questions about NOVSMM. Can't find what you're looking for? Our support team is one click away.",
  "landing.faq.stillHaveQuestions": "Still have questions?",
  "landing.faq.supportReplies": "Our support team replies in minutes, 24/7.",
  "landing.faq.chatWithUs": "Chat with us",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Start free today",
  "landing.stickyCta.subtitle": "No credit card required",
  "landing.stickyCta.getStarted": "Get started",
  "landing.stickyCta.viewPricing": "View pricing",
  "landing.stickyCta.startFree": "Start free",
  // Landing — Social Proof
  "landing.socialProof.demo": "Illustrative",
  "landing.socialProof.action.signedUp": "just signed up",
  "landing.socialProof.action.placedOrder": "placed an order",
  "landing.socialProof.action.toppedUp": "topped up",
  "landing.socialProof.ariaLabel": "Platform activity",
  "landing.socialProof.dismiss": "Dismiss",
  // Dashboard
  "dashboard.welcome": "Welcome back",
  "dashboard.balance": "Available balance",
  "dashboard.activeOrders": "Active orders",
  "dashboard.completedOrders": "Completed",
  "dashboard.revenue": "Revenue today",
  "marketplace.title": "Buy · Sell · History",
  "marketplace.buy": "Services",
  "marketplace.sell": "Sell",
  "marketplace.history": "Purchase history",
  "marketplace.search": "Search services",
  "marketplace.perThousand": "Per 1000",
  "marketplace.placeOrder": "Place order",
  "marketplace.viewDetails": "View details",
  "wallet.title": "Balance & activity",
  "wallet.topUp": "Top up",
  "wallet.withdraw": "Withdraw",
  "wallet.available": "Available",
  "wallet.held": "Held",
  "wallet.transactions": "Transaction history",
  "orders.title": "All orders",
  "orders.all": "All",
  "orders.processing": "Processing",
  "orders.completed": "Completed",
  "orders.repeat": "Repeat",
  "orders.export": "Export CSV",
  "tickets.title": "Tickets",
  "tickets.new": "New ticket",
  "tickets.subject": "Subject",
  "tickets.message": "Message",
  "tickets.send": "Type your message…",
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all read",
  "notifications.live": "Live · connected",
  "profile.title": "Profile settings",
  "profile.currency": "Preferred currency",
  "profile.language": "Preferred language",
  "profile.save": "Save changes",
  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.signOut": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.forgotPassword": "Forgot password?",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.search": "Search",
  "common.actions": "Actions",
  "common.status": "Status",
};

const es: Partial<Translations> = {
  // Landing — Navbar
  "landing.nav.platform": "Plataforma",
  "landing.nav.services": "Servicios",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Pagos",
  "landing.nav.security": "Seguridad",
  "landing.nav.pricing": "Precios",
  "landing.nav.signIn": "Iniciar sesión",
  "landing.nav.startFree": "Empezar gratis",
  "landing.nav.dashboard": "Panel",
  // Landing — Hero
  "landing.hero.badge": "Procesando ahora",
  "landing.hero.title": "La infraestructura para",
  "landing.hero.titleHighlight": "marketing en redes sociales",
  "landing.hero.titleEnd": "a escala.",
  "landing.hero.subtitle": "NOVSMM unifica automatización de pedidos, un marketplace de revendedores y pagos en una sola plataforma — diseñada para equipos que lanzan a la velocidad de la atención.",
  "landing.hero.startFree": "Empezar gratis",
  "landing.hero.viewPricing": "Ver precios",
  "landing.hero.signIn": "Iniciar sesión",
  "landing.hero.noCardRequired": "Sin tarjeta de crédito",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "Controles SOC 2",
  // Landing — Footer
  "landing.footer.tagline": "Lanza a la velocidad de la atención.",
  "landing.footer.startFree": "Empezar gratis",
  "landing.footer.signIn": "Iniciar sesión",
  "landing.footer.availableIn": "Disponible en 60+ países · 12 monedas · soporte 24/7",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Privacidad primero · Seguro por diseño",
  "landing.footer.platform": "Plataforma",
  "landing.footer.solutions": "Soluciones",
  "landing.footer.company": "Empresa",
  "landing.footer.resources": "Recursos",
  "landing.footer.resellers": "Revendedores",
  "landing.footer.agencies": "Agencias",
  "landing.footer.enterprises": "Empresas",
  "landing.footer.creators": "Creadores",
  "landing.footer.wholesale": "Mayorista",
  "landing.footer.affiliates": "Afiliados",
  "landing.footer.about": "Acerca de",
  "landing.footer.careers": "Empleo",
  "landing.footer.press": "Prensa",
  "landing.footer.partners": "Socios",
  "landing.footer.contact": "Contacto",
  "landing.footer.status": "Estado",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "Referencia API",
  "landing.footer.changelog": "Cambios",
  "landing.footer.security": "Seguridad",
  "landing.footer.legal": "Legal",
  "landing.footer.dashboard": "Panel",
  "landing.footer.payments": "Pagos",
  "landing.footer.analytics": "Analíticas",
  "landing.footer.api": "API",
  "landing.footer.terms": "Términos",
  "landing.footer.privacy": "Privacidad",
  "landing.footer.cookies": "Cookies",
  // Landing — Services
  "landing.services.eyebrow": "Servicios",
  "landing.services.titleLine1": "Cada plataforma. Cada métrica.",
  "landing.services.titleLine2": "Una sola superficie de control.",
  "landing.services.description": "De crecimiento de seguidores a tiempo de visualización, NOVSMM orquesta más de 6.300 servicios en las plataformas donde tu audiencia realmente vive — impulsado por HuntSMM.",
  "landing.services.moreLabel": "+ más",
  "landing.services.totalServices": "servicios activos en total",
  "landing.services.svcUnit": "srv",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Compra al por mayor. Revende a tu precio.",
  "landing.marketplace.titleLine2": "Quédate con el margen.",
  "landing.marketplace.description": "Un marketplace abierto donde los revendedores compiten en precio, publican sus propias ofertas y ven el beneficio liquidarse en tiempo real — sin tocar la infraestructura.",
  "landing.marketplace.flow.label": "El flujo",
  "landing.marketplace.flow.title": "Del suministro al beneficio liquidado en un ciclo continuo",
  "landing.marketplace.flow.supply.title": "Suministro de proveedores",
  "landing.marketplace.flow.supply.desc": "Proveedores aprobados publican servicios a precios mayoristas.",
  "landing.marketplace.flow.supply.chip": "mayorista",
  "landing.marketplace.flow.markup.title": "Margen de revendedor",
  "landing.marketplace.flow.markup.desc": "Define márgenes por servicio, por nivel de cliente, por moneda.",
  "landing.marketplace.flow.markup.chip": "tu margen",
  "landing.marketplace.flow.checkout.title": "Checkout del comprador",
  "landing.marketplace.flow.checkout.desc": "Los clientes compran a tu precio de venta en 5 pasarelas.",
  "landing.marketplace.flow.checkout.chip": "venta",
  "landing.marketplace.flow.settlement.title": "Liquidación instantánea",
  "landing.marketplace.flow.settlement.desc": "El beneficio se acredita en tu wallet en el momento en que empieza el pedido.",
  "landing.marketplace.flow.settlement.chip": "beneficio",
  "landing.marketplace.flow.loopback": "El beneficio se recicla en saldo — financia el siguiente pedido al instante.",
  "landing.marketplace.offers.label": "Tablón de ofertas en vivo",
  "landing.marketplace.offers.title": "Compite en precio. Gana el pedido.",
  "landing.marketplace.offers.statusLive": "en vivo",
  "landing.marketplace.offers.statusSample": "muestra",
  "landing.marketplace.offers.sampleNotice": "Mostrando ofertas de muestra — publica las tuyas desde el panel para llenar el tablón en vivo.",
  "landing.marketplace.offers.cost": "costo",
  "landing.marketplace.offers.retail": "venta",
  "landing.marketplace.offers.sold": "vendidos",
  "landing.marketplace.offers.walletLabel": "Saldo de wallet",
  "landing.marketplace.offers.withdraw": "Retirar",
  // Landing — Payments
  "landing.payments.eyebrow": "Pagos",
  "landing.payments.titleLine1": "Un saldo. Cada moneda.",
  "landing.payments.titleLine2": "Liquidado en minutos.",
  "landing.payments.description": "NOVSMM enruta cada transacción a través de PayPal, Mercado Pago, NowPayments (cripto) o liquidación manual — con conversión FX a tipos de mercado medio y más de 100 criptomonedas aceptadas.",
  "landing.payments.metaCurrencies": "Mon.",
  "landing.payments.metaSettlement": "Liq.",
  "landing.payments.metaSecurity": "Seg.",
  "landing.payments.statGateways": "Pasarelas de pago",
  "landing.payments.statCurrencies": "Monedas",
  "landing.payments.statFailure": "Tasa de fallo",
  "landing.payments.statSettlement": "Liquidación media",
  "landing.payments.coinFieldLabel": "Reacciona al scroll y al cursor · acelerado por GPU",
  "landing.payments.provider.paypal.note": "Protección al comprador y wallets guardadas. Confianza global.",
  "landing.payments.provider.paypal.coverage": "200+ países",
  "landing.payments.provider.mercadopago.note": "Plataforma de pagos líder en Latinoamérica. Carriles locales.",
  "landing.payments.provider.mercadopago.coverage": "Región LATAM",
  "landing.payments.provider.nowpayments.note": "Acepta más de 100 criptomonedas. Conversión automática a fiat. Cero contracargos.",
  "landing.payments.provider.nowpayments.coverage": "Global",
  "landing.payments.provider.manual.note": "Contacta a nuestro equipo por WhatsApp para créditos manuales. Sin comisiones.",
  "landing.payments.provider.manual.coverage": "Global",
  "landing.payments.settlement.instant": "Instantáneo",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (vía proveedor)",
  "landing.payments.security.decentralized": "Descentralizado",
  "landing.payments.security.verified": "Verificado",
  // Landing — Stats
  "landing.stats.eyebrow": "Estadísticas",
  "landing.stats.titleLine1": "Números que se mueven",
  "landing.stats.titleLine2": "a la velocidad de la atención.",
  "landing.stats.description": "Cada contador de abajo está conectado a la misma telemetría que alimenta los paneles de operadores — actualizada continuamente, nunca cacheada para vanidad.",
  "landing.stats.orders.label": "Pedidos completados",
  "landing.stats.orders.sub": "histórico, en {count} servicios",
  "landing.stats.users.label": "Usuarios activos",
  "landing.stats.users.sub": "revendedores y agencias, 30d",
  "landing.stats.revenue.label": "Ingresos enrutados",
  "landing.stats.revenue.sub": "a través del marketplace",
  "landing.stats.enterprise.label": "Clientes enterprise",
  "landing.stats.enterprise.sub": "con infra dedicada",
  "landing.stats.chart.label": "Ventas diarias · últimos 14 días",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "Estado del sistema",
  "landing.stats.status.state": "operativo",
  "landing.stats.status.uptimeLabel": "uptime, últimos 90d",
  "landing.stats.status.60daysAgo": "hace 60 días",
  "landing.stats.status.today": "hoy",
  "landing.stats.status.avgStart": "Inicio medio",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Testimonios",
  "landing.testimonials.titleLine1": "Operadores que cambiaron.",
  "landing.testimonials.titleLine2": "Resultados que se quedaron.",
  "landing.testimonials.description": "Experiencias representativas de usuarios de la plataforma. Los resultados pueden variar.",
  "landing.testimonials.verifiedBy": "Verificado por operadores de NOVSMM",
  "landing.testimonials.proof.avgRating": "Valoración media",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Cambiaron desde",
  "landing.testimonials.proof.countries": "Países atendidos",
  // Landing — Security
  "landing.security.eyebrow": "Seguridad",
  "landing.security.titleLine1": "Seguridad que puedes ver —",
  "landing.security.titleLine2": "no solo una lista.",
  "landing.security.description": "Cada capa de abajo está instrumentada, monitorizada y visible en vivo para los operadores. Esta es la postura que exigen los equipos enterprise.",
  "landing.security.statusActive": "activo",
  "landing.security.layer.ddos.title": "Protección DDoS",
  "landing.security.layer.ddos.desc": "Mitigación L3/L4/L7 siempre activa en el edge. Capacidad de 2.4 Tbps.",
  "landing.security.layer.ddos.metric": "0 ataques brechas",
  "landing.security.layer.tls.title": "TLS 1.3 en todo",
  "landing.security.layer.tls.desc": "Cifrado de extremo a extremo en tránsito. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "Calificación A+ · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 en reposo",
  "landing.security.layer.aes.desc": "Todas las wallets, claves y PII cifradas con DEK por inquilino.",
  "landing.security.layer.aes.metric": "Módulos FIPS 140-2",
  "landing.security.layer.backups.title": "Backups continuos",
  "landing.security.layer.backups.desc": "PITR cada 60s, réplicas entre regiones, retención de 30 días.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "Alta disponibilidad",
  "landing.security.layer.ha.desc": "Activo-activo en 3 regiones. Failover automático en menos de 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "Protección de API",
  "landing.security.layer.api.desc": "Límites por clave, detección de anomalías, webhooks firmados.",
  "landing.security.layer.api.metric": "<0.01% peticiones malas",
  "landing.security.layer.audit.title": "Logs de auditoría",
  "landing.security.layer.audit.desc": "Logs inmutables y exportables para cada acción privilegiada.",
  "landing.security.layer.audit.metric": "Retención de 12 meses",
  "landing.security.layer.auth.title": "Auth segura",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, claves de hardware. Provisioning SCIM.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Datos",
  "landing.security.shield.keys": "Claves",
  "landing.security.metric.threats": "Amenazas bloqueadas",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Regiones",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "API para desarrolladores",
  "landing.apiDocs.titleLine1": "Construye con la",
  "landing.apiDocs.titleLine2": "API de NOVSMM.",
  "landing.apiDocs.description": "Un contrato REST compatible con PerfectPanel / JAP — drop-in compatible con tus bots, paneles y herramientas de automatización existentes. Auth bearer, claves con permisos, webhooks firmados.",
  "landing.apiDocs.compatNote": "Compatible con el tooling de paneles SMM existente — sin instalar SDK.",
  "landing.apiDocs.whatYouGet": "Lo que obtienes",
  "landing.apiDocs.everythingYouNeed": "Todo lo que una integración de revendedor necesita",
  "landing.apiDocs.feature.endpoints.title": "7 endpoints REST",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — cobertura total.",
  "landing.apiDocs.feature.batching.title": "Batch multi-pedido",
  "landing.apiDocs.feature.batching.desc": "Envía hasta 100 pedidos en una sola petición. Fallo atómico, éxito parcial.",
  "landing.apiDocs.feature.dripFeed.title": "Programación drip-feed",
  "landing.apiDocs.feature.dripFeed.desc": "Divide la entrega en fragmentos con ejecuciones e intervalos configurables.",
  "landing.apiDocs.feature.refill.title": "Peticiones de refill",
  "landing.apiDocs.feature.refill.desc": "Dispara la re-entrega en pedidos completados cuando las cuentas bajan dentro de 30 días.",
  "landing.apiDocs.feature.webhooks.title": "Webhooks firmados",
  "landing.apiDocs.feature.webhooks.desc": "Eventos firmados con HMAC para cambios de estado de pedido — replay-safe e idempotentes.",
  "landing.apiDocs.feature.keys.title": "Claves API con permisos",
  "landing.apiDocs.feature.keys.desc": "Permisos por clave: read, order, wallet, marketplace. Rotación sin downtime.",
  "landing.apiDocs.viewDocs": "Ver docs completos de la API",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min por clave",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Afiliados",
  "landing.affiliates.titleLine1": "Gana un 10% de comisión",
  "landing.affiliates.titleLine2": "en cada referencia.",
  "landing.affiliates.description": "Atribución de por vida, pagos en tiempo real, sin límites. El programa de afiliados de NOVSMM es el sistema de referencias mejor pagado del ecosistema SMM.",
  "landing.affiliates.stats.affiliates": "afiliados ganando hoy",
  "landing.affiliates.stats.paidOut": "pagado a afiliados",
  "landing.affiliates.stats.commission": "comisión de por vida",
  "landing.affiliates.commission.label": "Estructura de comisión",
  "landing.affiliates.commission.title": "10% de por vida · pago mínimo $50",
  "landing.affiliates.commission.yourShare": "Tu parte",
  "landing.affiliates.commission.theirOrder": "Su pedido",
  "landing.affiliates.commission.customerOrder": "pedido del cliente",
  "landing.affiliates.commission.example": "Ejemplo: un pedido de $100 te acredita {amount} — al instante, cada vez, para siempre.",
  "landing.affiliates.payout.label": "Métodos de pago",
  "landing.affiliates.payout.wallet.label": "Saldo de wallet",
  "landing.affiliates.payout.wallet.note": "Instantáneo · sin comisiones",
  "landing.affiliates.payout.paypal.note": "mínimo $50",
  "landing.affiliates.payout.usdt.note": "mínimo $50",
  "landing.affiliates.howItWorks.label": "Cómo funciona",
  "landing.affiliates.howItWorks.title": "Tres pasos hacia ingresos para siempre",
  "landing.affiliates.step1.title": "Comparte tu enlace",
  "landing.affiliates.step1.desc": "Consigue un enlace de referencia único desde tu panel. Publica donde quieras — Twitter, Telegram, el footer de tu panel.",
  "landing.affiliates.step2.title": "Se registran y piden",
  "landing.affiliates.step2.desc": "Cualquiera que se registre con tu enlace queda etiquetado como tu referencia — para siempre. Sin ventanas de atribución.",
  "landing.affiliates.step3.title": "Ganas un 10% para siempre",
  "landing.affiliates.step3.desc": "Cada pedido que hagan te genera un 10% de comisión — acreditado en tu wallet en tiempo real, retirable cuando quieras.",
  "landing.affiliates.cta.become": "Hazte afiliado",
  "landing.affiliates.cta.openDashboard": "Abre tu panel de referencias",
  "landing.affiliates.cta.note": "Sin proceso de aprobación · Activación instantánea · Retira cuando quieras",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Preguntas frecuentes",
  "landing.faq.description": "Respuestas a las preguntas más comunes sobre NOVSMM. ¿No encuentras lo que buscas? Nuestro equipo de soporte está a un clic.",
  "landing.faq.stillHaveQuestions": "¿Aún tienes preguntas?",
  "landing.faq.supportReplies": "Nuestro equipo de soporte responde en minutos, 24/7.",
  "landing.faq.chatWithUs": "Chatea con nosotros",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Empieza gratis hoy",
  "landing.stickyCta.subtitle": "Sin tarjeta de crédito",
  "landing.stickyCta.getStarted": "Empezar",
  "landing.stickyCta.viewPricing": "Ver precios",
  "landing.stickyCta.startFree": "Empezar gratis",
  // Landing — Social Proof
  "landing.socialProof.demo": "Ilustrativo",
  "landing.socialProof.action.signedUp": "se acaba de registrar",
  "landing.socialProof.action.placedOrder": "hizo un pedido",
  "landing.socialProof.action.toppedUp": "recargó saldo",
  "landing.socialProof.ariaLabel": "Actividad de la plataforma",
  "landing.socialProof.dismiss": "Cerrar",
  // Dashboard
  "dashboard.welcome": "Bienvenido de nuevo",
  "dashboard.balance": "Saldo disponible",
  "dashboard.activeOrders": "Pedidos activos",
  "dashboard.completedOrders": "Completados",
  "dashboard.revenue": "Ingresos hoy",
  "marketplace.title": "Comprar · Vender · Historial",
  "marketplace.buy": "Servicios",
  "marketplace.sell": "Vender",
  "marketplace.history": "Historial de compras",
  "marketplace.search": "Buscar servicios",
  "marketplace.perThousand": "Por 1000",
  "marketplace.placeOrder": "Realizar pedido",
  "marketplace.viewDetails": "Ver detalles",
  "wallet.title": "Saldo y actividad",
  "wallet.topUp": "Recargar",
  "wallet.withdraw": "Retirar",
  "wallet.available": "Disponible",
  "wallet.held": "Retenido",
  "wallet.transactions": "Historial de transacciones",
  "orders.title": "Todos los pedidos",
  "orders.all": "Todos",
  "orders.processing": "Procesando",
  "orders.completed": "Completados",
  "orders.repeat": "Repetir",
  "orders.export": "Exportar CSV",
  "tickets.title": "Tickets",
  "tickets.new": "Nuevo ticket",
  "tickets.subject": "Asunto",
  "tickets.message": "Mensaje",
  "tickets.send": "Escribe tu mensaje…",
  "notifications.title": "Notificaciones",
  "notifications.markAllRead": "Marcar todo como leído",
  "notifications.live": "En vivo · conectado",
  "profile.title": "Configuración de perfil",
  "profile.currency": "Moneda preferida",
  "profile.language": "Idioma preferido",
  "profile.save": "Guardar cambios",
  "auth.signIn": "Iniciar sesión",
  "auth.signUp": "Registrarse",
  "auth.signOut": "Cerrar sesión",
  "auth.email": "Correo",
  "auth.password": "Contraseña",
  "auth.forgotPassword": "¿Olvidaste tu contraseña?",
  "common.loading": "Cargando…",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.search": "Buscar",
  "common.actions": "Acciones",
  "common.status": "Estado",
};

const pt: Partial<Translations> = {
  // Landing — Navbar
  "landing.nav.platform": "Plataforma",
  "landing.nav.services": "Serviços",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Pagamentos",
  "landing.nav.security": "Segurança",
  "landing.nav.pricing": "Preços",
  "landing.nav.signIn": "Entrar",
  "landing.nav.startFree": "Começar grátis",
  "landing.nav.dashboard": "Painel",
  // Landing — Hero
  "landing.hero.badge": "Processando agora",
  "landing.hero.title": "A infraestrutura para",
  "landing.hero.titleHighlight": "marketing em redes sociais",
  "landing.hero.titleEnd": "em escala.",
  "landing.hero.subtitle": "NOVSMM unifica automação de pedidos, um marketplace de revendedores e pagamentos em uma só plataforma — projetada para equipes que lançam na velocidade da atenção.",
  "landing.hero.startFree": "Começar grátis",
  "landing.hero.viewPricing": "Ver preços",
  "landing.hero.signIn": "Entrar",
  "landing.hero.noCardRequired": "Sem cartão de crédito",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "Controles SOC 2",
  // Landing — Footer
  "landing.footer.tagline": "Lance na velocidade da atenção.",
  "landing.footer.startFree": "Começar grátis",
  "landing.footer.signIn": "Entrar",
  "landing.footer.availableIn": "Disponível em 60+ países · 12 moedas · suporte 24/7",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Privacidade primeiro · Seguro por design",
  "landing.footer.platform": "Plataforma",
  "landing.footer.solutions": "Soluções",
  "landing.footer.company": "Empresa",
  "landing.footer.resources": "Recursos",
  "landing.footer.resellers": "Revendedores",
  "landing.footer.agencies": "Agências",
  "landing.footer.enterprises": "Empresas",
  "landing.footer.creators": "Criadores",
  "landing.footer.wholesale": "Atacado",
  "landing.footer.affiliates": "Afiliados",
  "landing.footer.about": "Sobre",
  "landing.footer.careers": "Carreiras",
  "landing.footer.press": "Imprensa",
  "landing.footer.partners": "Parceiros",
  "landing.footer.contact": "Contato",
  "landing.footer.status": "Status",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "Referência API",
  "landing.footer.changelog": "Mudanças",
  "landing.footer.security": "Segurança",
  "landing.footer.legal": "Legal",
  "landing.footer.dashboard": "Painel",
  "landing.footer.payments": "Pagamentos",
  "landing.footer.analytics": "Análises",
  "landing.footer.api": "API",
  "landing.footer.terms": "Termos",
  "landing.footer.privacy": "Privacidade",
  "landing.footer.cookies": "Cookies",
  // Landing — Services
  "landing.services.eyebrow": "Serviços",
  "landing.services.titleLine1": "Cada plataforma. Cada métrica.",
  "landing.services.titleLine2": "Uma só superfície de controle.",
  "landing.services.description": "De crescimento de seguidores a tempo de visualização, NOVSMM orquestra mais de 6.300 serviços nas plataformas onde sua audiência realmente vive — com tecnologia HuntSMM.",
  "landing.services.moreLabel": "+ mais",
  "landing.services.totalServices": "serviços ativos no total",
  "landing.services.svcUnit": "srv",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Compre no atacado. Revenda pelo seu preço.",
  "landing.marketplace.titleLine2": "Fique com a margem.",
  "landing.marketplace.description": "Um marketplace aberto onde revendedores competem em preço, publicam suas próprias ofertas e veem o lucro liquidar em tempo real — sem tocar na infraestrutura.",
  "landing.marketplace.flow.label": "O fluxo",
  "landing.marketplace.flow.title": "Do fornecimento ao lucro liquidado em um ciclo contínuo",
  "landing.marketplace.flow.supply.title": "Fornecimento de provedores",
  "landing.marketplace.flow.supply.desc": "Provedores aprovados publicam serviços com preços de atacado.",
  "landing.marketplace.flow.supply.chip": "atacado",
  "landing.marketplace.flow.markup.title": "Margem de revendedor",
  "landing.marketplace.flow.markup.desc": "Defina margens por serviço, por nível de cliente, por moeda.",
  "landing.marketplace.flow.markup.chip": "sua margem",
  "landing.marketplace.flow.checkout.title": "Checkout do comprador",
  "landing.marketplace.flow.checkout.desc": "Clientes compram pelo seu preço de varejo em 5 gateways.",
  "landing.marketplace.flow.checkout.chip": "varejo",
  "landing.marketplace.flow.settlement.title": "Liquidação instantânea",
  "landing.marketplace.flow.settlement.desc": "O lucro é creditado na sua wallet no momento em que o pedido começa.",
  "landing.marketplace.flow.settlement.chip": "lucro",
  "landing.marketplace.flow.loopback": "O lucro recicla em saldo — financie o próximo pedido instantaneamente.",
  "landing.marketplace.offers.label": "Painel de ofertas ao vivo",
  "landing.marketplace.offers.title": "Compita em preço. Vença o pedido.",
  "landing.marketplace.offers.statusLive": "ao vivo",
  "landing.marketplace.offers.statusSample": "amostra",
  "landing.marketplace.offers.sampleNotice": "Exibindo ofertas de amostra — publique as suas pelo painel para preencher o painel ao vivo.",
  "landing.marketplace.offers.cost": "custo",
  "landing.marketplace.offers.retail": "varejo",
  "landing.marketplace.offers.sold": "vendidos",
  "landing.marketplace.offers.walletLabel": "Saldo da wallet",
  "landing.marketplace.offers.withdraw": "Sacar",
  // Landing — Payments
  "landing.payments.eyebrow": "Pagamentos",
  "landing.payments.titleLine1": "Um saldo. Cada moeda.",
  "landing.payments.titleLine2": "Liquidado em minutos.",
  "landing.payments.description": "NOVSMM roteia cada transação via PayPal, Mercado Pago, NowPayments (cripto) ou liquidação manual — com conversão FX a taxas de mercado intermediárias e mais de 100 criptomoedas aceitas.",
  "landing.payments.metaCurrencies": "Mo.",
  "landing.payments.metaSettlement": "Liq.",
  "landing.payments.metaSecurity": "Seg.",
  "landing.payments.statGateways": "Gateways de pagamento",
  "landing.payments.statCurrencies": "Moedas",
  "landing.payments.statFailure": "Taxa de falha",
  "landing.payments.statSettlement": "Liquidação média",
  "landing.payments.coinFieldLabel": "Reativo ao scroll e ao cursor · acelerado por GPU",
  "landing.payments.provider.paypal.note": "Proteção ao comprador e wallets salvas. Confiança global.",
  "landing.payments.provider.paypal.coverage": "200+ países",
  "landing.payments.provider.mercadopago.note": "Plataforma de pagamentos líder na América Latina. Rails locais.",
  "landing.payments.provider.mercadopago.coverage": "Região LATAM",
  "landing.payments.provider.nowpayments.note": "Aceite mais de 100 criptomoedas. Conversão automática para fiat. Zero chargebacks.",
  "landing.payments.provider.nowpayments.coverage": "Global",
  "landing.payments.provider.manual.note": "Fale com nossa equipe via WhatsApp para créditos manuais. Sem taxas.",
  "landing.payments.provider.manual.coverage": "Global",
  "landing.payments.settlement.instant": "Instantâneo",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (via provedor)",
  "landing.payments.security.decentralized": "Descentralizado",
  "landing.payments.security.verified": "Verificado",
  // Landing — Stats
  "landing.stats.eyebrow": "Estatísticas",
  "landing.stats.titleLine1": "Números que se movem",
  "landing.stats.titleLine2": "na velocidade da atenção.",
  "landing.stats.description": "Cada contador abaixo está ligado à mesma telemetria que alimenta os painéis de operadores — atualizada continuamente, nunca cacheada para vaidade.",
  "landing.stats.orders.label": "Pedidos concluídos",
  "landing.stats.orders.sub": "histórico, em {count} serviços",
  "landing.stats.users.label": "Usuários ativos",
  "landing.stats.users.sub": "revendedores e agências, 30d",
  "landing.stats.revenue.label": "Receita roteada",
  "landing.stats.revenue.sub": "pelo marketplace",
  "landing.stats.enterprise.label": "Clientes enterprise",
  "landing.stats.enterprise.sub": "com infra dedicada",
  "landing.stats.chart.label": "Vendas diárias · últimos 14 dias",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "Status do sistema",
  "landing.stats.status.state": "operacional",
  "landing.stats.status.uptimeLabel": "uptime, últimos 90d",
  "landing.stats.status.60daysAgo": "há 60 dias",
  "landing.stats.status.today": "hoje",
  "landing.stats.status.avgStart": "Início médio",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Depoimentos",
  "landing.testimonials.titleLine1": "Operadores que trocaram.",
  "landing.testimonials.titleLine2": "Resultados que ficaram.",
  "landing.testimonials.description": "Experiências representativas de usuários da plataforma. Resultados podem variar.",
  "landing.testimonials.verifiedBy": "Verificado por operadores do NOVSMM",
  "landing.testimonials.proof.avgRating": "Avaliação média",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Trocou de",
  "landing.testimonials.proof.countries": "Países atendidos",
  // Landing — Security
  "landing.security.eyebrow": "Segurança",
  "landing.security.titleLine1": "Segurança que você vê —",
  "landing.security.titleLine2": "não só uma checklist.",
  "landing.security.description": "Cada camada abaixo é instrumentada, monitorada e exibida ao vivo para operadores. Esta é a postura que times enterprise exigem.",
  "landing.security.statusActive": "ativo",
  "landing.security.layer.ddos.title": "Proteção DDoS",
  "landing.security.layer.ddos.desc": "Mitigação L3/L4/L7 sempre ativa no edge. Capacidade de 2.4 Tbps.",
  "landing.security.layer.ddos.metric": "0 ataques vazados",
  "landing.security.layer.tls.title": "TLS 1.3 em todo lugar",
  "landing.security.layer.tls.desc": "Criptografia ponta a ponta em trânsito. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "Nota A+ · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 em repouso",
  "landing.security.layer.aes.desc": "Todas as wallets, chaves e PII criptografadas com DEK por inquilino.",
  "landing.security.layer.aes.metric": "Módulos FIPS 140-2",
  "landing.security.layer.backups.title": "Backups contínuos",
  "landing.security.layer.backups.desc": "PITR a cada 60s, réplicas entre regiões, retenção de 30 dias.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "Alta disponibilidade",
  "landing.security.layer.ha.desc": "Ativo-ativo em 3 regiões. Failover automático em menos de 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "Proteção de API",
  "landing.security.layer.api.desc": "Limites por chave, detecção de anomalias, webhooks assinados.",
  "landing.security.layer.api.metric": "<0.01% requisições ruins",
  "landing.security.layer.audit.title": "Logs de auditoria",
  "landing.security.layer.audit.desc": "Logs imutáveis e exportáveis para cada ação privilegiada.",
  "landing.security.layer.audit.metric": "Retenção de 12 meses",
  "landing.security.layer.auth.title": "Auth segura",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, chaves de hardware. Provisioning SCIM.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Dados",
  "landing.security.shield.keys": "Chaves",
  "landing.security.metric.threats": "Ameaças bloqueadas",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Regiões",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "API para desenvolvedores",
  "landing.apiDocs.titleLine1": "Construa com a",
  "landing.apiDocs.titleLine2": "API da NOVSMM.",
  "landing.apiDocs.description": "Um contrato REST compatível com PerfectPanel / JAP — drop-in compatível com seus bots, painéis e ferramentas de automação existentes. Auth bearer, chaves com escopos, webhooks assinados.",
  "landing.apiDocs.compatNote": "Compatível com ferramentas de painel SMM existentes — sem instalar SDK.",
  "landing.apiDocs.whatYouGet": "O que você obtém",
  "landing.apiDocs.everythingYouNeed": "Tudo que uma integração de revendedor precisa",
  "landing.apiDocs.feature.endpoints.title": "7 endpoints REST",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — cobertura total.",
  "landing.apiDocs.feature.batching.title": "Batch multi-pedido",
  "landing.apiDocs.feature.batching.desc": "Envie até 100 pedidos em uma única requisição. Falha atômica, sucesso parcial.",
  "landing.apiDocs.feature.dripFeed.title": "Agendamento drip-feed",
  "landing.apiDocs.feature.dripFeed.desc": "Divida a entrega em parcelas com execuções e intervalos configuráveis.",
  "landing.apiDocs.feature.refill.title": "Pedidos de refill",
  "landing.apiDocs.feature.refill.desc": "Dispare a re-entrega em pedidos concluídos quando as contas caírem em até 30 dias.",
  "landing.apiDocs.feature.webhooks.title": "Webhooks assinados",
  "landing.apiDocs.feature.webhooks.desc": "Eventos assinados com HMAC para mudanças de status — replay-safe e idempotentes.",
  "landing.apiDocs.feature.keys.title": "Chaves de API com escopos",
  "landing.apiDocs.feature.keys.desc": "Permissões por chave: read, order, wallet, marketplace. Rotação sem downtime.",
  "landing.apiDocs.viewDocs": "Ver docs completas da API",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min por chave",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Afiliados",
  "landing.affiliates.titleLine1": "Ganhe 10% de comissão",
  "landing.affiliates.titleLine2": "em cada indicação.",
  "landing.affiliates.description": "Atribuição vitalícia, pagamentos em tempo real, sem limites. O programa de afiliados da NOVSMM é o sistema de indicações que mais paga no ecossistema SMM.",
  "landing.affiliates.stats.affiliates": "afiliados ganhando hoje",
  "landing.affiliates.stats.paidOut": "pago a afiliados",
  "landing.affiliates.stats.commission": "comissão vitalícia",
  "landing.affiliates.commission.label": "Estrutura de comissão",
  "landing.affiliates.commission.title": "10% vitalício · pagamento mínimo $50",
  "landing.affiliates.commission.yourShare": "Sua parte",
  "landing.affiliates.commission.theirOrder": "O pedido deles",
  "landing.affiliates.commission.customerOrder": "pedido do cliente",
  "landing.affiliates.commission.example": "Exemplo: um pedido de $100 credita {amount} pra você — instantaneamente, toda vez, para sempre.",
  "landing.affiliates.payout.label": "Métodos de pagamento",
  "landing.affiliates.payout.wallet.label": "Saldo da wallet",
  "landing.affiliates.payout.wallet.note": "Instantâneo · sem taxas",
  "landing.affiliates.payout.paypal.note": "mínimo $50",
  "landing.affiliates.payout.usdt.note": "mínimo $50",
  "landing.affiliates.howItWorks.label": "Como funciona",
  "landing.affiliates.howItWorks.title": "Três passos para renda para sempre",
  "landing.affiliates.step1.title": "Compartilhe seu link",
  "landing.affiliates.step1.desc": "Pegue um link de indicação único no seu painel. Publique onde quiser — Twitter, Telegram, o rodapé do seu painel.",
  "landing.affiliates.step2.title": "Eles se cadastram e pedem",
  "landing.affiliates.step2.desc": "Quem se cadastrar pelo seu link fica marcado como sua indicação — para a vida toda. Sem janelas de atribuição.",
  "landing.affiliates.step3.title": "Você ganha 10% para sempre",
  "landing.affiliates.step3.desc": "Cada pedido que fizerem rende 10% de comissão — creditado na sua wallet em tempo real, sacável quando quiser.",
  "landing.affiliates.cta.become": "Vire afiliado",
  "landing.affiliates.cta.openDashboard": "Abra seu painel de indicações",
  "landing.affiliates.cta.note": "Sem processo de aprovação · Ativação instantânea · Saque quando quiser",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Perguntas frequentes",
  "landing.faq.description": "Respostas para as perguntas mais comuns sobre a NOVSMM. Não encontrou o que procura? Nosso time de suporte está a um clique.",
  "landing.faq.stillHaveQuestions": "Ainda tem dúvidas?",
  "landing.faq.supportReplies": "Nosso time de suporte responde em minutos, 24/7.",
  "landing.faq.chatWithUs": "Fale com a gente",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Comece grátis hoje",
  "landing.stickyCta.subtitle": "Sem cartão de crédito",
  "landing.stickyCta.getStarted": "Começar",
  "landing.stickyCta.viewPricing": "Ver preços",
  "landing.stickyCta.startFree": "Começar grátis",
  // Landing — Social Proof
  "landing.socialProof.demo": "Ilustrativo",
  "landing.socialProof.action.signedUp": "acabou de se cadastrar",
  "landing.socialProof.action.placedOrder": "fez um pedido",
  "landing.socialProof.action.toppedUp": "recarregou saldo",
  "landing.socialProof.ariaLabel": "Atividade da plataforma",
  "landing.socialProof.dismiss": "Dispensar",
  // Dashboard
  "dashboard.welcome": "Bem-vindo de volta",
  "dashboard.balance": "Saldo disponível",
  "dashboard.activeOrders": "Pedidos ativos",
  "dashboard.completedOrders": "Concluídos",
  "dashboard.revenue": "Receita hoje",
  "marketplace.title": "Comprar · Vender · Histórico",
  "marketplace.buy": "Serviços",
  "marketplace.sell": "Vender",
  "marketplace.history": "Histórico de compras",
  "marketplace.search": "Pesquisar serviços",
  "marketplace.perThousand": "Por 1000",
  "marketplace.placeOrder": "Fazer pedido",
  "marketplace.viewDetails": "Ver detalhes",
  "wallet.title": "Saldo e atividade",
  "wallet.topUp": "Recarregar",
  "wallet.withdraw": "Sacar",
  "wallet.available": "Disponível",
  "wallet.held": "Retido",
  "wallet.transactions": "Histórico de transações",
  "orders.title": "Todos os pedidos",
  "orders.all": "Todos",
  "orders.processing": "Processando",
  "orders.completed": "Concluídos",
  "orders.repeat": "Repetir",
  "orders.export": "Exportar CSV",
  "tickets.title": "Tickets",
  "tickets.new": "Novo ticket",
  "tickets.subject": "Assunto",
  "tickets.message": "Mensagem",
  "tickets.send": "Digite sua mensagem…",
  "notifications.title": "Notificações",
  "notifications.markAllRead": "Marcar tudo como lido",
  "notifications.live": "Ao vivo · conectado",
  "profile.title": "Configurações de perfil",
  "profile.currency": "Moeda preferida",
  "profile.language": "Idioma preferido",
  "profile.save": "Salvar alterações",
  "auth.signIn": "Entrar",
  "auth.signUp": "Cadastrar",
  "auth.signOut": "Sair",
  "auth.email": "E-mail",
  "auth.password": "Senha",
  "auth.forgotPassword": "Esqueceu a senha?",
  "common.loading": "Carregando…",
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.delete": "Excluir",
  "common.search": "Pesquisar",
  "common.actions": "Ações",
  "common.status": "Status",
};

const fr: Partial<Translations> = {
  // Landing — Navbar
  "landing.nav.platform": "Plateforme",
  "landing.nav.services": "Services",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.payments": "Paiements",
  "landing.nav.security": "Sécurité",
  "landing.nav.pricing": "Tarifs",
  "landing.nav.signIn": "Se connecter",
  "landing.nav.startFree": "Commencer gratuitement",
  "landing.nav.dashboard": "Tableau de bord",
  // Landing — Hero
  "landing.hero.badge": "Traitement en cours",
  "landing.hero.title": "L'infrastructure pour le",
  "landing.hero.titleHighlight": "marketing sur réseaux sociaux",
  "landing.hero.titleEnd": "à grande échelle.",
  "landing.hero.subtitle": "NOVSMM unifie l'automatisation des commandes, un marketplace de revendeurs et les paiements en une seule plateforme — conçue pour les équipes qui lancent à la vitesse de l'attention.",
  "landing.hero.startFree": "Commencer gratuitement",
  "landing.hero.viewPricing": "Voir les tarifs",
  "landing.hero.signIn": "Se connecter",
  "landing.hero.noCardRequired": "Sans carte de crédit",
  "landing.hero.uptimeSLA": "99.99% uptime SLA",
  "landing.hero.soc2": "Contrôles SOC 2",
  // Landing — Footer
  "landing.footer.tagline": "Lancez à la vitesse de l'attention.",
  "landing.footer.startFree": "Commencer gratuitement",
  "landing.footer.signIn": "Se connecter",
  "landing.footer.availableIn": "Disponible dans 60+ pays · 12 devises · support 24/7",
  "landing.footer.copyright": "NOVSMM",
  "landing.footer.privacyFirst": "Confidentialité d'abord · Sécurisé par design",
  "landing.footer.platform": "Plateforme",
  "landing.footer.solutions": "Solutions",
  "landing.footer.company": "Entreprise",
  "landing.footer.resources": "Ressources",
  "landing.footer.resellers": "Revendeurs",
  "landing.footer.agencies": "Agences",
  "landing.footer.enterprises": "Entreprises",
  "landing.footer.creators": "Créateurs",
  "landing.footer.wholesale": "Gros",
  "landing.footer.affiliates": "Affiliés",
  "landing.footer.about": "À propos",
  "landing.footer.careers": "Carrières",
  "landing.footer.press": "Presse",
  "landing.footer.partners": "Partenaires",
  "landing.footer.contact": "Contact",
  "landing.footer.status": "Statut",
  "landing.footer.docs": "Docs",
  "landing.footer.apiRef": "Référence API",
  "landing.footer.changelog": "Changements",
  "landing.footer.security": "Sécurité",
  "landing.footer.legal": "Légal",
  "landing.footer.dashboard": "Tableau de bord",
  "landing.footer.payments": "Paiements",
  "landing.footer.analytics": "Analyses",
  "landing.footer.api": "API",
  "landing.footer.terms": "Conditions",
  "landing.footer.privacy": "Confidentialité",
  "landing.footer.cookies": "Cookies",
  // Landing — Services
  "landing.services.eyebrow": "Services",
  "landing.services.titleLine1": "Chaque plateforme. Chaque métrique.",
  "landing.services.titleLine2": "Une seule surface de contrôle.",
  "landing.services.description": "De la croissance des abonnés au temps de visionnage, NOVSMM orchestre plus de 6 300 services sur les plateformes où votre audience vit réellement — propulsé par HuntSMM.",
  "landing.services.moreLabel": "+ plus",
  "landing.services.totalServices": "services actifs au total",
  "landing.services.svcUnit": "srv",
  // Landing — Marketplace
  "landing.marketplace.eyebrow": "Marketplace",
  "landing.marketplace.titleLine1": "Achetez en gros. Revendez à votre prix.",
  "landing.marketplace.titleLine2": "Gardez la marge.",
  "landing.marketplace.description": "Un marketplace ouvert où les revendeurs rivalisent sur les prix, publient leurs propres offres et voient le profit se régler en temps réel — sans toucher à l'infrastructure.",
  "landing.marketplace.flow.label": "Le flux",
  "landing.marketplace.flow.title": "De l'approvisionnement au profit réglé en un cycle continu",
  "landing.marketplace.flow.supply.title": "Approvisionnement fournisseurs",
  "landing.marketplace.flow.supply.desc": "Les fournisseurs approuvés publient des services à des prix de gros.",
  "landing.marketplace.flow.supply.chip": "gros",
  "landing.marketplace.flow.markup.title": "Marge revendeur",
  "landing.marketplace.flow.markup.desc": "Définissez les marges par service, par niveau de client, par devise.",
  "landing.marketplace.flow.markup.chip": "votre marge",
  "landing.marketplace.flow.checkout.title": "Checkout acheteur",
  "landing.marketplace.flow.checkout.desc": "Les clients achètent au prix de détail sur 5 passerelles.",
  "landing.marketplace.flow.checkout.chip": "détail",
  "landing.marketplace.flow.settlement.title": "Règlement instantané",
  "landing.marketplace.flow.settlement.desc": "Le profit est crédité sur votre wallet dès qu'une commande démarre.",
  "landing.marketplace.flow.settlement.chip": "profit",
  "landing.marketplace.flow.loopback": "Le profit se recycle en solde — financez la prochaine commande instantanément.",
  "landing.marketplace.offers.label": "Tableau des offres en direct",
  "landing.marketplace.offers.title": "Rivalisez sur les prix. Gagnez la commande.",
  "landing.marketplace.offers.statusLive": "en direct",
  "landing.marketplace.offers.statusSample": "échantillon",
  "landing.marketplace.offers.sampleNotice": "Affichage d'offres d'échantillon — publiez les vôtres depuis le tableau de bord pour remplir le tableau en direct.",
  "landing.marketplace.offers.cost": "coût",
  "landing.marketplace.offers.retail": "détail",
  "landing.marketplace.offers.sold": "vendus",
  "landing.marketplace.offers.walletLabel": "Solde du wallet",
  "landing.marketplace.offers.withdraw": "Retirer",
  // Landing — Payments
  "landing.payments.eyebrow": "Paiements",
  "landing.payments.titleLine1": "Un solde. Chaque devise.",
  "landing.payments.titleLine2": "Réglé en minutes.",
  "landing.payments.description": "NOVSMM achemine chaque transaction via PayPal, Mercado Pago, NowPayments (crypto) ou règlement manuel — avec conversion FX aux taux du marché moyen et plus de 100 cryptomonnaies acceptées.",
  "landing.payments.metaCurrencies": "Dev.",
  "landing.payments.metaSettlement": "Règl.",
  "landing.payments.metaSecurity": "Séc.",
  "landing.payments.statGateways": "Passerelles de paiement",
  "landing.payments.statCurrencies": "Devises",
  "landing.payments.statFailure": "Taux d'échec",
  "landing.payments.statSettlement": "Règlement moyen",
  "landing.payments.coinFieldLabel": "Réactif au défilement et au curseur · accélération GPU",
  "landing.payments.provider.paypal.note": "Protection acheteur et wallets sauvegardés. Confiance mondiale.",
  "landing.payments.provider.paypal.coverage": "200+ pays",
  "landing.payments.provider.mercadopago.note": "Plateforme de paiement leader en Amérique latine. Rails locaux.",
  "landing.payments.provider.mercadopago.coverage": "Région LATAM",
  "landing.payments.provider.nowpayments.note": "Acceptez plus de 100 cryptomonnaies. Conversion automatique en fiat. Zéro rétrofacturations.",
  "landing.payments.provider.nowpayments.coverage": "Mondial",
  "landing.payments.provider.manual.note": "Contactez notre équipe via WhatsApp pour des crédits manuels. Zéro frais.",
  "landing.payments.provider.manual.coverage": "Mondial",
  "landing.payments.settlement.instant": "Instantané",
  "landing.payments.settlement.onchain": "~5 min (on-chain)",
  "landing.payments.settlement.hours": "1-24h",
  "landing.payments.security.pciL1": "PCI DSS L1 (via fournisseur)",
  "landing.payments.security.decentralized": "Décentralisé",
  "landing.payments.security.verified": "Vérifié",
  // Landing — Stats
  "landing.stats.eyebrow": "Statistiques",
  "landing.stats.titleLine1": "Des chiffres qui bougent",
  "landing.stats.titleLine2": "à la vitesse de l'attention.",
  "landing.stats.description": "Chaque compteur ci-dessous est relié à la même télémétrie qui alimente les tableaux de bord des opérateurs — mis à jour en continu, jamais mis en cache pour la vanité.",
  "landing.stats.orders.label": "Commandes traitées",
  "landing.stats.orders.sub": "historique, sur {count} services",
  "landing.stats.users.label": "Utilisateurs actifs",
  "landing.stats.users.sub": "revendeurs et agences, 30j",
  "landing.stats.revenue.label": "Revenus acheminés",
  "landing.stats.revenue.sub": "via le marketplace",
  "landing.stats.enterprise.label": "Clients entreprise",
  "landing.stats.enterprise.sub": "avec infra dédiée",
  "landing.stats.chart.label": "Ventes quotidiennes · 14 derniers jours",
  "landing.stats.chart.dod": "DoD",
  "landing.stats.status.label": "État du système",
  "landing.stats.status.state": "opérationnel",
  "landing.stats.status.uptimeLabel": "uptime, 90j glissants",
  "landing.stats.status.60daysAgo": "il y a 60 jours",
  "landing.stats.status.today": "aujourd'hui",
  "landing.stats.status.avgStart": "Démarrage moyen",
  "landing.stats.status.throughput": "Throughput",
  "landing.stats.status.perMin": "/min",
  // Landing — Testimonials
  "landing.testimonials.eyebrow": "Témoignages",
  "landing.testimonials.titleLine1": "Opérateurs qui ont changé.",
  "landing.testimonials.titleLine2": "Résultats qui sont restés.",
  "landing.testimonials.description": "Expériences représentatives d'utilisateurs de la plateforme. Les résultats peuvent varier.",
  "landing.testimonials.verifiedBy": "Vérifié par les opérateurs NOVSMM",
  "landing.testimonials.proof.avgRating": "Note moyenne",
  "landing.testimonials.proof.nps": "Net promoter score",
  "landing.testimonials.proof.switchedFrom": "Arrivés de",
  "landing.testimonials.proof.countries": "Pays desservis",
  // Landing — Security
  "landing.security.eyebrow": "Sécurité",
  "landing.security.titleLine1": "Une sécurité visible —",
  "landing.security.titleLine2": "pas juste une checklist.",
  "landing.security.description": "Chaque couche ci-dessous est instrumentée, surveillée et affichée en direct aux opérateurs. C'est la posture qu'exigent les équipes entreprise.",
  "landing.security.statusActive": "actif",
  "landing.security.layer.ddos.title": "Protection DDoS",
  "landing.security.layer.ddos.desc": "Mitigation L3/L4/L7 toujours active en périphérie. Capacité 2.4 Tbps.",
  "landing.security.layer.ddos.metric": "0 attaques franchies",
  "landing.security.layer.tls.title": "TLS 1.3 partout",
  "landing.security.layer.tls.desc": "Chiffrement de bout en bout en transit. HSTS preload, OCSP stapling.",
  "landing.security.layer.tls.metric": "Note A+ · SSL Labs",
  "landing.security.layer.aes.title": "AES-256 au repos",
  "landing.security.layer.aes.desc": "Tous les wallets, clés et PII chiffrés avec DEK par locataire.",
  "landing.security.layer.aes.metric": "Modules FIPS 140-2",
  "landing.security.layer.backups.title": "Backups continus",
  "landing.security.layer.backups.desc": "PITR toutes les 60s, réplicas inter-régions, rétention 30 jours.",
  "landing.security.layer.backups.metric": "RPO 60s · RTO 5m",
  "landing.security.layer.ha.title": "Haute disponibilité",
  "landing.security.layer.ha.desc": "Actif-actif sur 3 régions. Bascule automatique en moins de 30s.",
  "landing.security.layer.ha.metric": "99.99% uptime SLA",
  "landing.security.layer.api.title": "Protection API",
  "landing.security.layer.api.desc": "Limites par clé, détection d'anomalies, webhooks signés.",
  "landing.security.layer.api.metric": "<0.01% mauvaises requêtes",
  "landing.security.layer.audit.title": "Logs d'audit",
  "landing.security.layer.audit.desc": "Logs immuables et exportables pour chaque action privilégiée.",
  "landing.security.layer.audit.metric": "Rétention 12 mois",
  "landing.security.layer.auth.title": "Auth sécurisée",
  "landing.security.layer.auth.desc": "SSO, 2FA, passkeys, clés matérielles. Provisioning SCIM.",
  "landing.security.layer.auth.metric": "Passkey + WebAuthn",
  "landing.security.shield.edge": "Edge",
  "landing.security.shield.app": "App",
  "landing.security.shield.data": "Données",
  "landing.security.shield.keys": "Clés",
  "landing.security.metric.threats": "Menaces bloquées",
  "landing.security.metric.mttr": "MTTR",
  "landing.security.metric.regions": "Régions",
  // Landing — API Docs
  "landing.apiDocs.eyebrow": "API développeur",
  "landing.apiDocs.titleLine1": "Construisez avec",
  "landing.apiDocs.titleLine2": "l'API NOVSMM.",
  "landing.apiDocs.description": "Un contrat REST compatible PerfectPanel / JAP — drop-in compatible avec vos bots, panneaux et outils d'automatisation existants. Auth bearer, clés à permissions, webhooks signés.",
  "landing.apiDocs.compatNote": "Compatible avec les outils de panneaux SMM existants — sans installation de SDK.",
  "landing.apiDocs.whatYouGet": "Ce que vous obtenez",
  "landing.apiDocs.everythingYouNeed": "Tout ce qu'une intégration revendeur nécessite",
  "landing.apiDocs.feature.endpoints.title": "7 endpoints REST",
  "landing.apiDocs.feature.endpoints.desc": "Services, orders, status, cancel, refill, refill_status, balance — couverture totale.",
  "landing.apiDocs.feature.batching.title": "Batch multi-commandes",
  "landing.apiDocs.feature.batching.desc": "Soumettez jusqu'à 100 commandes en une seule requête. Échec atomique, succès partiel.",
  "landing.apiDocs.feature.dripFeed.title": "Planification drip-feed",
  "landing.apiDocs.feature.dripFeed.desc": "Découpez la livraison en fragments avec exécutions et intervalles configurables.",
  "landing.apiDocs.feature.refill.title": "Demandes de refill",
  "landing.apiDocs.feature.refill.desc": "Déclenchez la re-livraison sur commandes terminées quand les comptes chutent sous 30 jours.",
  "landing.apiDocs.feature.webhooks.title": "Webhooks signés",
  "landing.apiDocs.feature.webhooks.desc": "Événements signés HMAC pour les changements de statut — replay-safe et idempotents.",
  "landing.apiDocs.feature.keys.title": "Clés API à permissions",
  "landing.apiDocs.feature.keys.desc": "Permissions par clé : read, order, wallet, marketplace. Rotation sans downtime.",
  "landing.apiDocs.viewDocs": "Voir la doc API complète",
  "landing.apiDocs.versionNote": "v1.0.0 · 60 req/min par clé",
  // Landing — Affiliates
  "landing.affiliates.eyebrow": "Affiliés",
  "landing.affiliates.titleLine1": "Gagnez 10% de commission",
  "landing.affiliates.titleLine2": "sur chaque parrainage.",
  "landing.affiliates.description": "Attribution à vie, paiements en temps réel, sans plafond. Le programme d'affiliation NOVSMM est le système de parrainage le mieux rémunéré de l'écosystème SMM.",
  "landing.affiliates.stats.affiliates": "affiliés gagnent aujourd'hui",
  "landing.affiliates.stats.paidOut": "versés aux affiliés",
  "landing.affiliates.stats.commission": "commission à vie",
  "landing.affiliates.commission.label": "Structure de commission",
  "landing.affiliates.commission.title": "10% à vie · paiement minimum 50 $",
  "landing.affiliates.commission.yourShare": "Votre part",
  "landing.affiliates.commission.theirOrder": "Leur commande",
  "landing.affiliates.commission.customerOrder": "commande client",
  "landing.affiliates.commission.example": "Exemple : une commande de 100 $ vous crédite {amount} — instantanément, à chaque fois, pour toujours.",
  "landing.affiliates.payout.label": "Méthodes de paiement",
  "landing.affiliates.payout.wallet.label": "Solde du wallet",
  "landing.affiliates.payout.wallet.note": "Instantané · sans frais",
  "landing.affiliates.payout.paypal.note": "minimum 50 $",
  "landing.affiliates.payout.usdt.note": "minimum 50 $",
  "landing.affiliates.howItWorks.label": "Comment ça marche",
  "landing.affiliates.howItWorks.title": "Trois étapes vers un revenu à vie",
  "landing.affiliates.step1.title": "Partagez votre lien",
  "landing.affiliates.step1.desc": "Obtenez un lien de parrainage unique depuis votre tableau de bord. Partagez-le où vous voulez — Twitter, Telegram, le pied de page de votre panneau.",
  "landing.affiliates.step2.title": "Ils s'inscrivent et commandent",
  "landing.affiliates.step2.desc": "Quiconque s'inscrit via votre lien est tagué comme votre filleul — à vie. Pas de fenêtres d'attribution.",
  "landing.affiliates.step3.title": "Vous gagnez 10% pour toujours",
  "landing.affiliates.step3.desc": "Chaque commande qu'ils passent vous rapporte 10% de commission — crédité sur votre wallet en temps réel, retirable à tout moment.",
  "landing.affiliates.cta.become": "Devenir affilié",
  "landing.affiliates.cta.openDashboard": "Ouvrir votre tableau de parrainage",
  "landing.affiliates.cta.note": "Sans processus d'approbation · Activation instantanée · Retrait à tout moment",
  // Landing — FAQ
  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Questions fréquentes",
  "landing.faq.description": "Réponses aux questions les plus courantes sur NOVSMM. Vous ne trouvez pas ce que vous cherchez ? Notre équipe support est à un clic.",
  "landing.faq.stillHaveQuestions": "D'autres questions ?",
  "landing.faq.supportReplies": "Notre équipe support répond en quelques minutes, 24/7.",
  "landing.faq.chatWithUs": "Discutez avec nous",
  // Landing — Sticky CTA
  "landing.stickyCta.title": "Commencez gratuitement aujourd'hui",
  "landing.stickyCta.subtitle": "Sans carte de crédit",
  "landing.stickyCta.getStarted": "Démarrer",
  "landing.stickyCta.viewPricing": "Voir les tarifs",
  "landing.stickyCta.startFree": "Commencer gratuitement",
  // Landing — Social Proof
  "landing.socialProof.demo": "Illustratif",
  "landing.socialProof.action.signedUp": "vient de s'inscrire",
  "landing.socialProof.action.placedOrder": "a passé une commande",
  "landing.socialProof.action.toppedUp": "a rechargé",
  "landing.socialProof.ariaLabel": "Activité de la plateforme",
  "landing.socialProof.dismiss": "Fermer",
  // Dashboard
  "dashboard.welcome": "Bon retour",
  "dashboard.balance": "Solde disponible",
  "dashboard.activeOrders": "Commandes actives",
  "dashboard.completedOrders": "Terminées",
  "dashboard.revenue": "Revenus du jour",
  "marketplace.title": "Acheter · Vendre · Historique",
  "marketplace.buy": "Services",
  "marketplace.sell": "Vendre",
  "marketplace.history": "Historique d'achats",
  "marketplace.search": "Rechercher des services",
  "marketplace.perThousand": "Par 1000",
  "marketplace.placeOrder": "Passer commande",
  "marketplace.viewDetails": "Voir les détails",
  "wallet.title": "Solde et activité",
  "wallet.topUp": "Recharger",
  "wallet.withdraw": "Retirer",
  "wallet.available": "Disponible",
  "wallet.held": "Bloqué",
  "wallet.transactions": "Historique des transactions",
  "orders.title": "Toutes les commandes",
  "orders.all": "Toutes",
  "orders.processing": "En cours",
  "orders.completed": "Terminées",
  "orders.repeat": "Répéter",
  "orders.export": "Exporter CSV",
  "tickets.title": "Tickets",
  "tickets.new": "Nouveau ticket",
  "tickets.subject": "Sujet",
  "tickets.message": "Message",
  "tickets.send": "Tapez votre message…",
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Tout marquer comme lu",
  "notifications.live": "En direct · connecté",
  "profile.title": "Paramètres du profil",
  "profile.currency": "Devise préférée",
  "profile.language": "Langue préférée",
  "profile.save": "Enregistrer",
  "auth.signIn": "Se connecter",
  "auth.signUp": "S'inscrire",
  "auth.signOut": "Se déconnecter",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.forgotPassword": "Mot de passe oublié ?",
  "common.loading": "Chargement…",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.search": "Rechercher",
  "common.actions": "Actions",
  "common.status": "Statut",
};

const allTranslations: Record<string, Partial<Translations>> = { en, es, pt, fr };

/**
 * Get translations for a language, with English fallback.
 */
export function getTranslations(lang: string): Translations {
  const t = allTranslations[lang] ?? allTranslations["en"];
  return { ...en, ...t } as Translations;
}

/**
 * Translate a single key.
 */
export function t(lang: string, key: TranslationKey, fallback?: string): string {
  const translations = getTranslations(lang);
  return translations[key] ?? fallback ?? key;
}
