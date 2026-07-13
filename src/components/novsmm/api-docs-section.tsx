"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  KeyRound,
  Webhook,
  Layers,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Magnetic } from "./magnetic";
import { useLanguage } from "./language-provider";

// i18n (U-C-007): FEATURES holds icon + translation keys; strings are looked
// up at render time via t().
const FEATURES = [
  {
    icon: Layers,
    titleKey: "landing.apiDocs.feature.endpoints.title",
    descKey: "landing.apiDocs.feature.endpoints.desc",
  },
  {
    icon: GitBranch,
    titleKey: "landing.apiDocs.feature.batching.title",
    descKey: "landing.apiDocs.feature.batching.desc",
  },
  {
    icon: RefreshCw,
    titleKey: "landing.apiDocs.feature.dripFeed.title",
    descKey: "landing.apiDocs.feature.dripFeed.desc",
  },
  {
    icon: ShieldCheck,
    titleKey: "landing.apiDocs.feature.refill.title",
    descKey: "landing.apiDocs.feature.refill.desc",
  },
  {
    icon: Webhook,
    titleKey: "landing.apiDocs.feature.webhooks.title",
    descKey: "landing.apiDocs.feature.webhooks.desc",
  },
  {
    icon: KeyRound,
    titleKey: "landing.apiDocs.feature.keys.title",
    descKey: "landing.apiDocs.feature.keys.desc",
  },
];

const REQUEST_SAMPLE = `# Place an order via API
curl -X POST https://api.novsmm.shop/api/v1/orders \\
  -H "Authorization: Bearer nvsk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"service":"abc123","link":"https://instagram.com/post","quantity":1000}'`;

const RESPONSE_SAMPLE = `{
  "status": "success",
  "order": "A-10432",
  "service": "Instagram · Followers HQ",
  "quantity": 1000,
  "price": 2.40,
  "currency": "USD",
  "status": "processing",
  "message": "Order placed successfully"
}`;

function CodeBlock({
  label,
  code,
  accent = "primary",
}: {
  label: string;
  code: string;
  accent?: "primary" | "emerald";
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-[#0a0d14] nov-ring">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50">
            <Terminal className="h-3 w-3" />
            {label}
          </span>
        </div>
        <span
          className={`text-[11px] font-medium uppercase tracking-wider ${
            accent === "emerald" ? "text-emerald-300/70" : "text-primary/80"
          }`}
        >
          {accent === "emerald" ? "200 OK" : "POST"}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[12.5px] leading-relaxed">
        <code className="font-mono text-emerald-100/90">{code}</code>
      </pre>
    </div>
  );
}

export function ApiDocsSection() {
  const { t } = useLanguage();
  return (
    <section id="api-docs" className="relative py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[120px]"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.apiDocs.eyebrow")}
          title={
            <>
              {t("landing.apiDocs.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.apiDocs.titleLine2")}
            </>
          }
          description={t("landing.apiDocs.description")}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Code column */}
          <Reveal blur>
            <div className="flex flex-col gap-4">
              <CodeBlock label="request.sh" code={REQUEST_SAMPLE} accent="primary" />
              <CodeBlock label="response.json" code={RESPONSE_SAMPLE} accent="emerald" />

              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background p-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  {t("landing.apiDocs.compatNote")}
                </span>
              </div>
            </div>
          </Reveal>

          {/* Features column */}
          <Reveal blur delay={0.08}>
            <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t("landing.apiDocs.whatYouGet")}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {t("landing.apiDocs.everythingYouNeed")}
              </div>

              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FEATURES.map((f, i) => (
                  <motion.li
                    key={f.titleKey}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary nov-ring transition-colors group-hover:bg-primary/10">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {t(f.titleKey)}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t(f.descKey)}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-5">
                <Magnetic
                  as="button"
                  strength={0.25}
                  onClick={() => window.open("/api-docs", "_blank")}
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                    {t("landing.apiDocs.viewDocs")}
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Magnetic>
                <span className="text-xs text-muted-foreground">
                  {t("landing.apiDocs.versionNote")}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
