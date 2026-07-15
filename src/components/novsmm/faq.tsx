"use client";

import { useState, useEffect } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

type FaqItem = {
  id: string;
  title: string;
  body: string;
  excerpt?: string;
  sortOrder?: number;
};

/**
 * Public FAQ section for the landing page.
 * Fetches published FAQ entries from /api/cms?type=faq (no auth required).
 * Renders as an accordion. If no FAQ entries are published, the section
 * is hidden gracefully (returns null).
 */
export function Faq() {
  const { t } = useLanguage();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  // Default FAQ items — shown when CMS has no published FAQ entries
  const DEFAULT_FAQ: FaqItem[] = [
    {
      id: "faq-1",
      title: "What is NOVSMM?",
      body: "NOVSMM is an automation infrastructure platform for social media marketing. We unify order automation, a reseller marketplace, and payments into one platform — engineered for teams that ship at the speed of attention.",
      excerpt: "NOVSMM is an automation infrastructure platform for social media marketing. We unify order automation, a reseller marketplace, and payments into one platform.",
    },
    {
      id: "faq-2",
      title: "How do I place an order?",
      body: "Create a free account, top up your wallet balance via PayPal, Mercado Pago, NowPayments (crypto), or manual settlement. Then browse the marketplace, select a service, enter your link and quantity, and click Order. Most orders start within 0-2 minutes.",
      excerpt: "Create a free account, top up your wallet, browse the marketplace, select a service, enter your link and quantity, and click Order.",
    },
    {
      id: "faq-3",
      title: "Which payment methods do you accept?",
      body: "We accept PayPal, Mercado Pago, NowPayments (100+ cryptocurrencies including Bitcoin, Ethereum, USDT), and manual settlement via WhatsApp/Zelle/Wire. All transactions are routed through secure payment gateways with FX conversion at mid-market rates.",
      excerpt: "PayPal, Mercado Pago, NowPayments (crypto), and manual settlement via WhatsApp/Zelle/Wire.",
    },
    {
      id: "faq-4",
      title: "Do you offer an API?",
      body: "Yes! Our REST API is PerfectPanel/JAP-compatible and available to all users. Generate an API key from your profile, choose your permission scopes (read, order, balance, refill, cancel), and start integrating. Rate limit: 60 requests/minute per key.",
      excerpt: "Yes! Our REST API is PerfectPanel/JAP-compatible. Generate an API key from your profile and start integrating.",
    },
    {
      id: "faq-5",
      title: "Can I resell your services?",
      body: "Absolutely! NOVSMM is built for resellers. Buy services at wholesale prices, set your own markup, and resell through your own panel or our marketplace. The affiliate program also offers 10% lifetime commission on referrals.",
      excerpt: "Yes! Buy at wholesale prices, set your markup, and resell. Plus 10% lifetime affiliate commission.",
    },
    {
      id: "faq-6",
      title: "Is my account secure?",
      body: "Security is our top priority. We use AES-256-GCM encryption for sensitive data, bcrypt for passwords, TOTP-based 2FA (with backup codes), nonce-based CSP, HSTS, and regular security audits. Your wallet balance is protected by atomic database transactions — no race conditions, no double-spending.",
      excerpt: "We use AES-256-GCM encryption, bcrypt, 2FA, nonce-based CSP, HSTS, and atomic database transactions for wallet protection.",
    },
    {
      id: "faq-7",
      title: "What happens if an order doesn't deliver?",
      body: "If an order fails to deliver within the estimated time, you can request a refill or cancel it for a full refund to your wallet balance. Our support team is available 24/7 via tickets to help resolve any issues.",
      excerpt: "Request a refill or cancel for a full refund. 24/7 support via tickets.",
    },
    {
      id: "faq-8",
      title: "Do you support child panels?",
      body: "Yes! Pro and Enterprise plans support child panels — create separate panels for your clients with their own branding, pricing, and balance. Each child panel operates independently while pulling from your master service catalog.",
      excerpt: "Yes! Pro and Enterprise plans support child panels with custom branding, pricing, and balance.",
    },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cms?type=faq&limit=50");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const cmsItems = data.items ?? [];
        // Use CMS items if available, otherwise use defaults
        setItems(cmsItems.length > 0 ? cmsItems : DEFAULT_FAQ);
      } catch {
        if (!cancelled) setItems(DEFAULT_FAQ);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Show defaults while loading or if no items at all
  const displayItems = items.length > 0 ? items : DEFAULT_FAQ;

  return (
    <section id="faq" className="relative py-4 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.faq.eyebrow")}
            title={t("landing.faq.title")}
            description={t("landing.faq.description")}
          />
        </Reveal>

        <Reveal blur>
          <div className="mt-10 flex flex-col gap-3">
            {displayItems.map((item, i) => {
              const isOpen = openIdx === i;
              // Use excerpt if present, otherwise show body (FAQ body is typically short)
              const answer = item.excerpt?.trim() || item.body;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border bg-background transition-colors",
                    isOpen ? "border-primary/40" : "border-border/60 hover:border-border"
                  )}
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                  >
                    <span className="text-sm font-semibold text-foreground sm:text-base">
                      {item.title}
                    </span>
                    {/* MOB-1b-003 FIX: CSS transition instead of framer-motion */}
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200",
                        isOpen ? "bg-primary/10 text-primary rotate-180" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  {/* MOB-1b-003 FIX: CSS grid-rows accordion instead of AnimatePresence */}
                  <div
                    id={`faq-panel-${i}`}
                    className="grid transition-all duration-200 ease-out"
                    style={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-4 text-sm text-muted-foreground whitespace-pre-line">
                        {answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                {t("landing.faq.stillHaveQuestions")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("landing.faq.supportReplies")}
              </div>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Scroll to WhatsApp widget (bottom-right) — the widget is
                // always present on the landing page.
                const el = document.querySelector("[aria-label='Open WhatsApp chat']") as HTMLElement | null;
                el?.click();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {t("landing.faq.chatWithUs")}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
