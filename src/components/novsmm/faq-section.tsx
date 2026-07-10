"use client";

import { motion } from "framer-motion";
import {
  HelpCircle,
  PackageCheck,
  CreditCard,
  Truck,
  RefreshCcw,
  Droplets,
  Gift,
  XCircle,
  Code2,
  ShieldCheck,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { useApp } from "./app-store";

type FAQ = {
  id: string;
  question: string;
  icon: React.ElementType;
  answer: React.ReactNode;
};

const FAQS: FAQ[] = [
  {
    id: "what-is-novsmm",
    question: "What is NOVSMM?",
    icon: HelpCircle,
    answer: (
      <>
        <p>
          NOVSMM is the automation infrastructure for digital-marketing teams,
          resellers, and enterprises that need to fulfill social-media
          engagement orders at scale. We aggregate dozens of upstream providers
          into a single API and dashboard, expose a real-time marketplace of
          services across every major platform, and handle payments, refunds,
          wallet accounting, and 24/7 fraud monitoring so you can focus on
          growing your business.
        </p>
        <p>
          Whether you are a solo creator buying followers for a launch, a
          reseller processing thousands of orders a day, or an agency white
          labeling the platform under your own brand, NOVSMM gives you the
          tooling, the SLAs, and the security to operate with confidence.
        </p>
      </>
    ),
  },
  {
    id: "how-to-order",
    question: "How do I place an order?",
    icon: PackageCheck,
    answer: (
      <>
        <p>Placing an order takes less than 30 seconds:</p>
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>Create an account and complete email verification.</li>
          <li>
            Top up your wallet via card, PayPal, MercadoPago, or crypto. Funds
            are credited instantly (crypto settles after 1 network
            confirmation).
          </li>
          <li>
            Open the <strong>Marketplace</strong> tab, search for the platform
            and service you need (e.g. &quot;Instagram · Followers · Real
            Worldwide&quot;), and click <strong>Order</strong>.
          </li>
          <li>
            Paste the target link, set the quantity, optionally enable
            drip-feed or auto-refill, and click <strong>Place order</strong>.
          </li>
          <li>
            Track status live from the <strong>Orders</strong> tab. You&apos;ll
            receive an in-app and email notification the moment it completes.
          </li>
        </ol>
        <p>
          For bulk or repeat ordering, use the <strong>Mass order</strong> and{" "}
          <strong>Repeat</strong> buttons, or drive everything programmatically
          through our REST API.
        </p>
      </>
    ),
  },
  {
    id: "payment-methods",
    question: "Which payment methods do you support?",
    icon: CreditCard,
    answer: (
      <>
        <p>
          We support 12 currencies and over 30 payment rails across 60+
          countries:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Cards:</strong> Visa, Mastercard, AMEX, Discover via Stripe
            (PCI-DSS Level 1).
          </li>
          <li>
            <strong>Wallets:</strong> PayPal worldwide, MercadoPago across
            Latin America.
          </li>
          <li>
            <strong>Crypto:</strong> BTC, ETH, USDT (TRC-20 / ERC-20), USDC,
            and 50+ altcoins via NowPayments — settled at locked rates with no
            KYC for orders under $1,000.
          </li>
          <li>
            <strong>Manual settlement:</strong> WhatsApp, Zelle, or wire
            transfer for high-ticket top-ups &gt; $500 — contact our team for
            instructions and zero-fee credits.
          </li>
          <li>
            <strong>Reseller credit:</strong> wholesale clients can request
            net-15 invoicing on approved plans.
          </li>
        </ul>
        <p>
          All transactions are encrypted end-to-end and we never store your full
          card number — tokenization is handled entirely by our PCI-compliant
          payment partners.
        </p>
      </>
    ),
  },
  {
    id: "delivery-time",
    question: "How long does delivery take?",
    icon: Truck,
    answer: (
      <>
        <p>
          Each service on the marketplace displays an estimated start time and
          delivery speed. Typical ranges:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Instant services</strong> (followers, likes, views): start
            within 0–60 seconds, complete in minutes to a few hours depending
            on quantity.
          </li>
          <li>
            <strong>Scheduled services</strong> (auto-engagement, story views):
            start within 5–30 minutes.
          </li>
          <li>
            <strong>Large / custom orders</strong> (&gt;100k units): typically
            delivered over 12–72 hours to protect the target account from
            algorithmic flags.
          </li>
          <li>
            <strong>Drip-feed</strong>: you set the pace — we spread delivery
            across hours or days as you choose.
          </li>
        </ul>
        <p>
          If an order hasn&apos;t started within 2× the estimated start time,
          open a support ticket and our team will re-queue or refund it within
          24 hours.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    question: "What is your refund policy?",
    icon: RefreshCcw,
    answer: (
      <>
        <p>
          We want you to be confident ordering on NOVSMM. Our refund policy is
          straightforward:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Orders still in <strong>Pending</strong> status can be cancelled
            for a full refund to your wallet with one click — no questions
            asked.
          </li>
          <li>
            <strong>Partial fulfillment</strong>: if an order completes with
            less than the purchased quantity, the unfilled portion is
            automatically credited back to your wallet within 24 hours.
          </li>
          <li>
            <strong>Auto-refill services</strong>: if a service advertises a
            refill guarantee (e.g. 30/60/365 days), we will top up any drop-off
            free of charge during that window.
          </li>
          <li>
            <strong>Wallet withdrawals</strong> to your bank or external wallet
            are processed in 1–5 business days; AML review may extend this for
            amounts &gt; $10,000.
          </li>
          <li>
            Funds loaded via card or PayPal are non-refundable to the original
            payment method except where required by law — they remain available
            in your NOVSMM wallet for future orders or withdrawal.
          </li>
        </ul>
        <p>
          To request a refund, open a ticket from the{" "}
          <strong>Support</strong> tab with the order ID and reason. Most cases
          are resolved within 24 hours.
        </p>
      </>
    ),
  },
  {
    id: "drip-feed",
    question: "What is drip-feed and when should I use it?",
    icon: Droplets,
    answer: (
      <>
        <p>
          <strong>Drip-feed</strong> splits a large order into smaller chunks
          delivered at regular intervals instead of all at once. For example, a
          10,000-follower order with drip-feed &quot;1,000 every 6 hours&quot;
          will be delivered in 10 batches over ~60 hours.
        </p>
        <p>
          Use drip-feed when:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            You want a natural-looking growth curve that avoids triggering
            platform spam detection.
          </li>
          <li>You&apos;re managing a fresh or sensitive account.</li>
          <li>
            You&apos;re running a long-haul campaign (e.g. building an audience
            for a product launch over weeks).
          </li>
        </ul>
        <p>
          Drip-feed is available on most marketplace services at no additional
          cost. Look for the <strong>Drip-feed</strong> badge in the service
          list.
        </p>
      </>
    ),
  },
  {
    id: "referral-program",
    question: "How does the referral program work?",
    icon: Gift,
    answer: (
      <>
        <p>
          Earn lifetime commissions by referring new users to NOVSMM:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>10% lifetime commission</strong> on every order placed by a
            user you refer — for as long as their account is active.
          </li>
          <li>
            Share your unique referral link from the{" "}
            <strong>Profile → Referrals</strong> tab or append{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">?ref=YOURCODE</code>{" "}
            to any NOVSMM URL.
          </li>
          <li>
            Commissions credit to your wallet as soon as the referred
            user&apos;s order is marked <strong>Completed</strong>.
          </li>
          <li>
            {/* BROAD-FIX-BATCH-1: minimum payout aligned with the canonical
                limits.minWithdrawal seed setting ($50). The previous $5 was
                inconsistent with both the seed and the legal Terms copy. */}
            Withdraw commissions anytime via the standard wallet-withdrawal
            flow; minimum payout is $50.
          </li>
          <li>
            Resellers on Wholesale plans earn a{" "}
            <strong>15% commission</strong> and gain access to a referral
            analytics dashboard, custom payout terms, and dedicated support.
          </li>
        </ul>
        <p>
          Self-referrals, fraudulent accounts, or coordinated sign-ups to
          inflate commissions are strictly prohibited and result in forfeiture
          of all earned commissions.
        </p>
      </>
    ),
  },
  {
    id: "cancel-order",
    question: "Can I cancel an order after placing it?",
    icon: XCircle,
    answer: (
      <>
        <p>
          Yes — but only while the order is still in <strong>Pending</strong>{" "}
          status (not yet dispatched to the upstream provider):
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Open the <strong>Orders</strong> tab, locate the order, and click
            the <strong>Cancel</strong> button. Funds are refunded to your
            wallet instantly.
          </li>
          <li>
            Once an order moves to <strong>Processing</strong> or{" "}
            <strong>Completed</strong>, it cannot be cancelled — the upstream
            provider has already begun fulfillment.
          </li>
          <li>
            For drip-feed orders, you may pause future batches but already
            dispatched batches are non-refundable.
          </li>
          <li>
            If you believe an order was placed in error and is already
            processing, open a support ticket — we&apos;ll review and offer a
            partial credit where possible.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "api",
    question: "Do you offer a developer API?",
    icon: Code2,
    answer: (
      <>
        <p>
          Yes. The NOVSMM REST API exposes every marketplace action so you can
          build reseller storefronts, white-label dashboards, telegram bots, or
          internal tooling on top of our infrastructure.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Endpoints:</strong> services list, place order, order
            status, order history, wallet balance, refill request, mass order,
            and user info. Full reference at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /api/docs
            </code>
            .
          </li>
          <li>
            <strong>Auth:</strong> HMAC-signed API keys with per-key scopes and
            IP allowlists. Rotate or revoke instantly from the dashboard.
          </li>
          <li>
            <strong>Rate limits:</strong> 60 requests/minute on standard plans,
            600/minute on Wholesale. Webhooks notify you of order status
            changes in real time.
          </li>
          <li>
            <strong>SDKs:</strong> official clients for JavaScript/TypeScript,
            Python, and PHP — plus community-contributed packages for Go and
            Ruby.
          </li>
          <li>
            <strong>Uptime:</strong> 99.95% monthly SLA with status page at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /status
            </code>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "security",
    question: "How do you keep my account and funds secure?",
    icon: ShieldCheck,
    answer: (
      <>
        <p>
          Security is foundational to NOVSMM. We operate under a defense-in-depth
          model:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Encryption:</strong> TLS 1.3 in transit, AES-256 at rest,
            bcrypt password hashing with per-user salts.
          </li>
          <li>
            <strong>Authentication:</strong> optional 2FA (TOTP via Google
            Authenticator / Authy), mandatory 2FA for admin and reseller
            accounts, hardware-key (WebAuthn / FIDO2) support on Enterprise
            plans.
          </li>
          <li>
            <strong>Fraud detection:</strong> real-time scoring on every login,
            payment, and withdrawal; device fingerprinting; velocity checks;
            and a 24/7 SOC that investigates flagged activity.
          </li>
          <li>
            <strong>Compliance:</strong> SOC 2 Type II, PCI DSS Level 1, GDPR,
            and CCPA. Annual third-party penetration testing and continuous bug
            bounty program.
          </li>
          <li>
            <strong>Operational:</strong> audit logs for every privileged
            action, session management with remote revocation, and IP
            allowlisting for sensitive endpoints.
          </li>
          <li>
            <strong>Backups:</strong> encrypted hourly snapshots with 30-day
            retention and quarterly disaster-recovery drills.
          </li>
        </ul>
        <p>
          For security disclosures or questions, email{" "}
          <a
            href="mailto:security@novsmm.shop"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            security@novsmm.shop
          </a>
          .
        </p>
      </>
    ),
  },
];

export function FAQSection() {
  const { setView } = useApp();

  return (
    <section
      id="faq"
      className="relative w-full border-t border-border/60 bg-background py-20 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-[120px]"
      />
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Answers to the questions we hear most"
          description="Everything you need to know about ordering, payments, refunds, the API, and security. Can't find what you're looking for? Reach out to our 24/7 support team."
        />

        <Reveal delay={0.15}>
          <div className="mt-12 overflow-hidden rounded-2xl border border-border/60 bg-background/60 backdrop-blur-sm">
            <Accordion
              type="single"
              collapsible
              defaultValue="what-is-novsmm"
              className="w-full"
            >
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className={
                    i === 0
                      ? "border-b px-5 sm:px-6"
                      : "border-b last:border-b-0 px-5 sm:px-6"
                  }
                >
                  <AccordionTrigger className="group hover:no-underline">
                    <span className="flex items-center gap-3 text-left">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <faq.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium tracking-tight text-foreground sm:text-base">
                        {faq.question}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-11 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline-offset-2 [&_a]:hover:underline [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_li]:mb-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/20 px-6 py-7 text-center sm:flex-row sm:text-left"
          >
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Still have questions?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Our team is online 24/7 via WhatsApp, live chat, and support
                tickets — typical reply under 5 minutes.
              </p>
            </div>
            <button
              onClick={() => setView("register")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
            >
              Start free
            </button>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
