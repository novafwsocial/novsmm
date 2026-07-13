"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cms?type=faq&limit=50");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items ?? []);
      } catch {
        // Network errors → silently hide section
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide section while loading or if no published FAQ entries exist
  if (loading || items.length === 0) return null;

  return (
    <section id="faq" className="relative py-20 sm:py-28">
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
            {items.map((item, i) => {
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
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 text-sm text-muted-foreground whitespace-pre-line">
                          {answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
