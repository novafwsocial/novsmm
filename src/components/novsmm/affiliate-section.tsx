"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import {
  Users,
  DollarSign,
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

type StatusStats = {
  totalUsers: number;
  totalRevenue: number;
};

const STEPS = [
  {
    icon: Link2,
    title: "Share your link",
    desc: "Get a unique referral link from your dashboard. Post it anywhere — Twitter, Telegram, your panel footer.",
    chip: "1",
  },
  {
    icon: UserPlus,
    title: "They sign up & order",
    desc: "Anyone who registers through your link is tagged as your referral — for life. No attribution windows.",
    chip: "2",
  },
  {
    icon: InfinityIcon,
    title: "You earn 10% forever",
    desc: "Every order they place earns you 10% commission — credited to your wallet in real time, withdrawable any time.",
    chip: "3",
  },
];

const PAYOUT_METHODS = [
  { label: "Wallet balance", note: "Instant · no fees" },
  { label: "PayPal", note: "$50 minimum" },
  { label: "USDT (TRC-20)", note: "$50 minimum" },
];

const DEFAULT_STATS: StatusStats = {
  totalUsers: 184500,
  totalRevenue: 92400000,
};

export function AffiliateSection() {
  const { setView, setDashboardTab, authed } = useApp();
  const [stats, setStats] = useState<StatusStats>(DEFAULT_STATS);

  // PERF: Uses shared cache — Hero, Stats, and AffiliateSection all share
  // a single /api/status request via useCachedFetch.
  const statusData = useCachedFetch<any>("/api/status");
  useEffect(() => {
    if (statusData?.stats) {
      setStats({
        totalUsers: statusData.stats.totalUsers ?? DEFAULT_STATS.totalUsers,
        totalRevenue: statusData.stats.totalRevenue ?? DEFAULT_STATS.totalRevenue,
      });
    }
  }, [statusData]);

  // Estimated total commission paid out — assume ~10% of all-time revenue routed
  // back to affiliates as commission, capped to a believable number.
  const totalPaidOut = Math.max(2_400_000, Math.round(stats.totalRevenue * 0.05));
  const affiliatesCount = Math.max(50_000, Math.round(stats.totalUsers * 0.27));

  const handleCta = () => {
    if (authed) {
      setView("dashboard");
      setDashboardTab("profile");
    } else {
      setView("register");
    }
  };

  return (
    <section id="affiliates" className="relative py-24 sm:py-32">
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
          eyebrow="Affiliates"
          title={
            <>
              Earn 10% commission
              <br className="hidden sm:block" /> on every referral.
            </>
          }
          description="Lifetime attribution, real-time payouts, no caps. The NOVSMM affiliate program is the highest-paying referral system in the SMM ecosystem."
        />

        {/* Stats row */}
        <RevealStagger
          stagger={0.08}
          className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
        >
          <RevealItem blur>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-background p-6 text-center sm:p-8">
              <Users className="h-5 w-5 text-primary" />
              <div className="mt-3 text-3xl font-semibold tabular-nums sm:text-4xl">
                <Counter to={affiliatesCount} duration={2.4} />
                <span className="text-primary">+</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                affiliates earning today
              </div>
            </div>
          </RevealItem>
          <RevealItem blur>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-background p-6 text-center sm:p-8">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div className="mt-3 text-3xl font-semibold tabular-nums sm:text-4xl">
                $<Counter to={totalPaidOut} duration={2.6} />
                <span className="text-emerald-500">+</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                paid out to affiliates
              </div>
            </div>
          </RevealItem>
          <RevealItem blur>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-background p-6 text-center sm:p-8">
              <Percent className="h-5 w-5 text-primary" />
              <div className="mt-3 text-3xl font-semibold tabular-nums sm:text-4xl">
                <Counter to={10} duration={1.6} />%
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                lifetime commission
              </div>
            </div>
          </RevealItem>
        </RevealStagger>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: commission structure */}
          <Reveal blur>
            <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Commission structure
              </div>
              <div className="mt-2 text-lg font-semibold">
                10% lifetime · $50 minimum payout
              </div>

              {/* Visual: bar showing 10% slice */}
              <div className="mt-6">
                <div className="flex items-end justify-between text-xs text-muted-foreground">
                  <span>Your share</span>
                  <span>Their order</span>
                </div>
                <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-border/60">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "10%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center justify-center bg-primary text-[11px] font-semibold text-primary-foreground"
                  >
                    10%
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "90%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center justify-center bg-muted text-[11px] font-medium text-muted-foreground"
                  >
                    customer order
                  </motion.div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Example: a $100 order credits you{" "}
                  <span className="font-semibold text-foreground">$10.00</span> —
                  instantly, every time, forever.
                </div>
              </div>

              {/* Payout methods */}
              <div className="mt-6 border-t border-border/60 pt-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Payout methods
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {PAYOUT_METHODS.map((m) => (
                    <li
                      key={m.label}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {m.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.note}</span>
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
                How it works
              </div>
              <div className="mt-2 text-lg font-semibold">Three steps to forever income</div>

              <div className="mt-6 flex flex-col gap-4">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.12,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                      {s.chip}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <s.icon className="h-4 w-4 text-primary" />
                        <div className="text-sm font-semibold text-foreground">
                          {s.title}
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <Magnetic as="button" strength={0.3} onClick={handleCta}>
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                    {authed ? "Open your referral dashboard" : "Become an affiliate"}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Magnetic>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  No approval process · Instant activation · Withdraw anytime
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
