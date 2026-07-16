"use client";

import {
  Percent,
  ArrowRight,
  Link2,
  UserPlus,
  Infinity as InfinityIcon,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { Counter } from "./counter";
import { Magnetic } from "./magnetic";
import { useApp } from "./app-store";
import { useLanguage } from "./language-provider";

// i18n (U-C-008): STEPS holds icon + chip + translation keys. Strings are
// looked up at render time via t().
const STEPS = [
  {
    icon: Link2,
    titleKey: "landing.affiliates.step1.title",
    descKey: "landing.affiliates.step1.desc",
    chip: "1",
  },
  {
    icon: UserPlus,
    titleKey: "landing.affiliates.step2.title",
    descKey: "landing.affiliates.step2.desc",
    chip: "2",
  },
  {
    icon: InfinityIcon,
    titleKey: "landing.affiliates.step3.title",
    descKey: "landing.affiliates.step3.desc",
    chip: "3",
  },
];

const PAYOUT_METHODS = [
  { labelKey: "landing.affiliates.payout.wallet.label", label: "Wallet balance", noteKey: "landing.affiliates.payout.wallet.note" },
  { label: "PayPal", noteKey: "landing.affiliates.payout.paypal.note" },
  { label: "USDT (TRC-20)", noteKey: "landing.affiliates.payout.usdt.note" },
];

export function AffiliateSection() {
  const { setView, setDashboardTab, authed } = useApp();
  const { t } = useLanguage();

  const handleCta = () => {
    if (authed) {
      setView("dashboard");
      setDashboardTab("profile");
    } else {
      setView("register");
    }
  };

  return (
    <section id="affiliates" className="relative py-4 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-1/3 -z-10 h-[320px] w-[320px] rounded-full bg-emerald-400/10 blur-[100px]"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.affiliates.eyebrow")}
          title={
            <>
              {t("landing.affiliates.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.affiliates.titleLine2")}
            </>
          }
          description={t("landing.affiliates.description")}
        />

        {/* Stats row */}
        <RevealStagger
          stagger={0.08}
          className="mt-12 grid grid-cols-1 gap-3 sm:gap-4"
        >
          <RevealItem blur>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-background p-6 text-center sm:p-8">
              <Percent className="h-5 w-5 text-primary" />
              <div className="mt-3 text-3xl font-semibold tabular-nums sm:text-4xl">
                {/* MOB-002 FIX: from=10 so SSR shows 10%, not 0% */}
                <Counter to={10} from={10} duration={1.6} />%
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("landing.affiliates.stats.commission")}
              </div>
            </div>
          </RevealItem>
        </RevealStagger>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: commission structure */}
          <Reveal blur>
            <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t("landing.affiliates.commission.label")}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {t("landing.affiliates.commission.title")}
              </div>

              {/* Visual: bar showing 10% slice */}
              <div className="mt-6">
                <div className="flex items-end justify-between text-xs text-muted-foreground">
                  <span>{t("landing.affiliates.commission.yourShare")}</span>
                  <span>{t("landing.affiliates.commission.theirOrder")}</span>
                </div>
                <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-border/60">
                  <div
                    className="fm-fade-up flex items-center justify-center bg-primary text-[11px] font-semibold text-primary-foreground"
                    style={{ width: "10%", animationDuration: "1s" }}
                  >
                    10%
                  </div>
                  <div
                    className="fm-fade-up flex items-center justify-center bg-muted text-[11px] font-medium text-muted-foreground"
                    style={{
                      width: "90%",
                      animationDuration: "1s",
                      animationDelay: "0.1s",
                    }}
                  >
                    {t("landing.affiliates.commission.customerOrder")}
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("landing.affiliates.commission.example").replace("{amount}", "$10.00")}
                </div>
              </div>

              {/* Payout methods */}
              <div className="mt-6 border-t border-border/60 pt-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  {t("landing.affiliates.payout.label")}
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {PAYOUT_METHODS.map((m) => (
                    <li
                      key={m.label}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {m.labelKey ? t(m.labelKey) : m.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{t(m.noteKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          {/* Right: how it works */}
          <Reveal blur delay={0.08}>
            <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t("landing.affiliates.howItWorks.label")}
              </div>
              <div className="mt-2 text-lg font-semibold">{t("landing.affiliates.howItWorks.title")}</div>

              <div className="mt-6 flex flex-col gap-4">
                {STEPS.map((s, i) => (
                  <div
                    key={s.titleKey}
                    className="fm-fade-up flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4"
                    style={{
                      animationDuration: "0.7s",
                      animationDelay: `${i * 0.12}s`,
                    }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                      {s.chip}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <s.icon className="h-4 w-4 text-primary" />
                        <div className="text-sm font-semibold text-foreground">
                          {t(s.titleKey)}
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t(s.descKey)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <Magnetic as="button" strength={0.3} onClick={handleCta}>
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                    {authed ? t("landing.affiliates.cta.openDashboard") : t("landing.affiliates.cta.become")}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Magnetic>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {t("landing.affiliates.cta.note")}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
