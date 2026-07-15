"use client";

import { Star, Quote } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { useLanguage } from "./language-provider";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  result: string;
  rating: number;
  initials: string;
  tone: string;
  /** UX (U-M-010): emoji avatar — more visual than initials alone */
  emoji: string;
};

const ROW_A: Testimonial[] = [
  {
    quote:
      "We migrated 14 reseller panels onto NOVSMM in a weekend. Order start time dropped from 40s to under 2s — our churn fell by a third.",
    name: "Daniela Ríos",
    role: "Head of Growth, Pulse Media",
    result: "+38% retention",
    rating: 5,
    initials: "DR",
    emoji: "🚀",
    tone: "from-primary/20 to-primary/5 text-primary",
  },
  {
    quote:
      "The marketplace is the first one that actually feels like infrastructure. Margins are mine, settlement is instant, and the API never lies.",
    name: "Marcus Chen",
    role: "Founder, ResellerStack",
    result: "$1.2M routed",
    rating: 5,
    initials: "MC",
    emoji: "📈",
    tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-700",
  },
  {
    quote:
      "Our agency manages 400+ creators. NOVSMM is the only platform that scales across all of them without us babysitting a single order.",
    name: "Amara Okafor",
    role: "Ops Director, Lumina Agency",
    result: "400 creators",
    rating: 5,
    initials: "AO",
    emoji: "⚡",
    tone: "from-violet-500/20 to-violet-500/5 text-violet-700",
  },
  {
    quote:
      "Crypto settlement in 3 minutes, zero chargebacks. This is what every SMM panel promises and none of them deliver.",
    name: "Tomás Rivera",
    role: "CEO, BoostLab",
    result: "0 chargebacks",
    rating: 5,
    initials: "TR",
    emoji: "🎯",
    tone: "from-amber-500/20 to-amber-500/5 text-amber-700",
  },
];

const ROW_B: Testimonial[] = [
  {
    quote:
      "The dashboard looks like it was built by a fintech company. Our clients trust it on first sight — signups converted 22% higher the week we switched.",
    name: "Sophie Laurent",
    role: "CRO, NorthPeak",
    result: "+22% conversion",
    rating: 5,
    initials: "SL",
    emoji: "💎",
    tone: "from-rose-500/20 to-rose-500/5 text-rose-700",
  },
  {
    quote:
      "We resell in 7 currencies. NOVSMM's FX at mid-market with instant wallet top-up is a genuine competitive moat for us.",
    name: "Kenji Watanabe",
    role: "COO, Orbit Social",
    result: "7 currencies",
    rating: 5,
    initials: "KW",
    emoji: "🔥",
    tone: "from-blue-500/20 to-blue-500/5 text-blue-700",
  },
  {
    quote:
      "Their security posture is the real deal — audit logs, role-based access, DDoS shielding. Our enterprise clients finally stopped asking.",
    name: "Elena Petrova",
    role: "CISO, Verge Media",
    result: "SOC 2-aligned",
    rating: 5,
    initials: "EP",
    emoji: "🌟",
    tone: "from-teal-500/20 to-teal-500/5 text-teal-700",
  },
  {
    quote:
      "I run a 9-person reseller team. The margin controls alone pay for the platform 10x over. The rest is pure upside.",
    name: "Idris Bello",
    role: "Owner, Crestline",
    result: "10× ROI",
    rating: 5,
    initials: "IB",
    emoji: "🏆",
    tone: "from-indigo-500/20 to-indigo-500/5 text-indigo-700",
  },
];

export function Testimonials() {
  const { t } = useLanguage();
  return (
    <section id="testimonials" className="relative overflow-hidden py-4 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.testimonials.eyebrow")}
          title={
            <>
              {t("landing.testimonials.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.testimonials.titleLine2")}
            </>
          }
          description={t("landing.testimonials.description")}
        />
      </div>

      {/* Edge fades */}
      <div className="relative mt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32"
        />

        <div className="flex flex-col gap-4">
          <MarqueeRow items={ROW_A} duration={48} />
          <MarqueeRow items={ROW_B} duration={56} reverse />
        </div>
      </div>

      {/* aggregate proof bar */}
      <Reveal>
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-muted/30 px-6 py-5 sm:grid-cols-4">
          <Proof label={t("landing.testimonials.proof.avgRating")} value="4.9 / 5.0" stars />
          <Proof label={t("landing.testimonials.proof.nps")} value="+72" />
          <Proof label={t("landing.testimonials.proof.switchedFrom")} value="12 panels" />
          <Proof label={t("landing.testimonials.proof.countries")} value="60+" />
        </div>
        <div className="mx-auto mt-3 max-w-5xl text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t("landing.testimonials.verifiedBy")}
        </div>
      </Reveal>
    </section>
  );
}

function MarqueeRow({
  items,
  duration,
  reverse,
}: {
  items: Testimonial[];
  duration: number;
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <div
        className={`flex shrink-0 gap-4 pr-4 ${reverse ? "fm-marquee-reverse" : "fm-marquee"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((t, i) => (
          <Card key={i} t={t} />
        ))}
      </div>
    </div>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <div className="group relative w-[320px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-shadow hover:nov-ring-lg sm:w-[400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-amber-400">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
          {t.result}
        </span>
      </div>
      <Quote className="mt-3 h-5 w-5 text-muted-foreground/40" />
      {/* AUDIT-FIX: line-clamp cuts the quote cleanly with "…" after N lines.
          Previously, overflow-hidden on the card container cut text mid-word,
          producing garbled fragments like "ty posture is the real deal — ole
          — based access". The clamp gives a graceful ellipsis on long quotes.
          Mobile (320px card): line-clamp-6 — more lines because the card is
          narrower so each line holds fewer characters.
          Desktop (400px card): line-clamp-4 — fewer lines needed since each
          line is wider. This keeps card heights uniform within each row. */}
      <p className="mt-1.5 line-clamp-6 sm:line-clamp-4 text-sm leading-relaxed text-foreground/90">
        {t.quote}
      </p>
      <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${t.tone} text-base`}
          aria-hidden
        >
          {t.emoji}
        </span>
        <div>
          <div className="text-sm font-medium text-foreground">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

function Proof({
  label,
  value,
  stars,
}: {
  label: string;
  value: string;
  stars?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
      <div className="flex items-center gap-1.5 text-xl font-semibold tabular-nums">
        {value}
        {stars && (
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        )}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
