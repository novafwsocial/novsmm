"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ShieldCheck, Globe2, Clock, Zap } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Counter } from "./counter";
import { PaymentLogo } from "./payment-logo";
import { useEffect, useState, useRef } from "react";

/* ── Provider data ────────────────────────────────────── */
const PROVIDERS = [
  {
    name: "Stripe",
    methods: ["Visa", "Mastercard", "Amex", "Cards"],
    currencies: 135,
    settlement: "Instant",
    security: "PCI DSS L1",
    coverage: "200+ countries",
    note: "Global card processing with 3-D Secure. Industry-standard reliability.",
  },
  {
    name: "PayPal",
    methods: ["PayPal", "Venmo", "Pay Later", "Cards"],
    currencies: 25,
    settlement: "Instant",
    security: "PCI DSS L1",
    coverage: "200+ countries",
    note: "Buyer protection & vaulted wallets. Trusted globally.",
  },
  {
    name: "Mercado Pago",
    methods: ["Mercado Pago", "Pix", "Boleto", "OXXO"],
    currencies: 6,
    settlement: "Instant",
    security: "PCI DSS L1",
    coverage: "LATAM region",
    note: "Leading payment platform in Latin America. Local rails.",
  },
  {
    name: "NowPayments",
    methods: ["BTC", "ETH", "USDT", "USDC", "+100 cryptos"],
    currencies: 100,
    settlement: "~5 min (on-chain)",
    security: "Decentralized",
    coverage: "Global",
    note: "Accept 100+ cryptocurrencies. Auto-conversion to fiat. Zero chargebacks.",
  },
  {
    name: "Manual",
    methods: ["WhatsApp", "Wire", "Zelle", "Custom"],
    currencies: 1,
    settlement: "1-24h",
    security: "Verified",
    coverage: "Global",
    note: "Contact our team via WhatsApp for manual credits. Zero fees.",
  },
];

/* ── Floating coin (currency) ─────────────────────────── */
type Coin = { glyph: string; label: string; size: number; x: number; y: number; depth: number; spin: number };
const COINS: Coin[] = [
  { glyph: "$", label: "USD", size: 64, x: 6, y: 14, depth: 1.4, spin: 8 },
  { glyph: "€", label: "EUR", size: 50, x: 82, y: 8, depth: 0.7, spin: -6 },
  { glyph: "₿", label: "BTC", size: 44, x: 90, y: 60, depth: 1.1, spin: 10 },
  { glyph: "£", label: "GBP", size: 40, x: 2, y: 70, depth: 0.9, spin: -7 },
  { glyph: "¥", label: "JPY", size: 36, x: 72, y: 82, depth: 0.6, spin: 5 },
  { glyph: "₹", label: "INR", size: 38, x: 22, y: 88, depth: 1.2, spin: -9 },
  { glyph: "B", label: "BRL", size: 34, x: 50, y: 4, depth: 0.8, spin: 6 },
  { glyph: "MX", label: "MXN", size: 32, x: 40, y: 92, depth: 1.0, spin: -5 },
];

export function Payments() {
  return (
    <section id="payments" className="relative overflow-hidden py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Payments"
          title={
            <>
              One balance. Every currency.
              <br className="hidden sm:block" /> Settled in minutes.
            </>
          }
          description="NOVSMM routes every transaction through Stripe, PayPal, Mercado Pago, NowPayments (crypto), or manual settlement — with FX conversion at mid-market rates and 100+ cryptocurrencies accepted."
        />

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
          {/* Coin field — gravity + mouse reactive */}
          {/* Rendered after mount to avoid hydration mismatch with framer-motion useMotionValue */}
          <ClientOnly>
            <CoinField />
          </ClientOnly>

          {/* Provider cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROVIDERS.map((p, i) => (
              <Reveal key={p.name} blur delay={i * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-shadow hover:nov-ring-lg">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/50">
                      <PaymentLogo name={p.name} size={24} />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {p.coverage}
                    </span>
                  </div>
                  <div className="mt-3 text-base font-semibold text-foreground">
                    {p.name}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {p.note}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.methods.map((m) => (
                      <span
                        key={m}
                        className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-[11px]">
                    <Meta icon={<Globe2 className="h-3 w-3" />} label="Cur.">
                      {p.currencies}
                    </Meta>
                    <Meta icon={<Clock className="h-3 w-3" />} label="Settle">
                      {p.settlement}
                    </Meta>
                    <Meta icon={<ShieldCheck className="h-3 w-3" />} label="Sec.">
                      {p.security}
                    </Meta>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Footer stat strip */}
        <Reveal delay={0.1}>
          <div className="mt-10 grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-4 sm:p-6">
            <Stat value={<><Counter to={5} duration={1.6} /></>} label="Payment gateways" />
            <Stat value={<><Counter to={135} duration={2} /></>} label="Currencies" />
            <Stat value={<><Counter to={0.4} decimals={1} duration={2} />%</>} label="Failure rate" />
            <Stat value={<><Counter to={3} duration={1.4} /> min</>} label="Avg. settlement" icon={<Zap className="h-3.5 w-3.5 text-primary" />} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-foreground tabular-nums">
        {children}
      </span>
    </div>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: React.ReactNode;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center sm:items-start sm:text-left">
      <div className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
        {icon}
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* ── ClientOnly: prevents hydration mismatch for interactive components ── */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // Using a ref + requestAnimationFrame to avoid the lint rule about setState in effect
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => setMounted(true));
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);
  if (!mounted) {
    // Placeholder with same dimensions to prevent layout shift
    return <div className="relative aspect-square w-full max-w-[460px] mx-auto rounded-3xl border border-border/60 bg-muted/30" />;
  }
  return <>{children}</>;
}

/* ── CoinField: gravity + mouse parallax ──────────────── */
function CoinField() {
  // mouse parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 18 });
  const smy = useSpring(my, { stiffness: 60, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px * 40);
    my.set(py * 40);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative aspect-square w-full max-w-[460px] mx-auto overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-muted/40 to-background nov-ring"
    >
      {/* gravity floor */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/[0.05] to-transparent"
      />
      <div className="absolute inset-0 nov-grid-bg opacity-40" />

      {/* coins */}
      {COINS.map((c, i) => (
        <FloatingCoin key={c.label} coin={c} index={i} smx={smx} smy={smy} />
      ))}

      {/* center label */}
      <div className="absolute inset-x-0 bottom-5 flex justify-center">
        <div className="rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-md">
          Reactive to scroll &amp; cursor · GPU accelerated
        </div>
      </div>
    </div>
  );
}

function FloatingCoin({
  coin: c,
  index: i,
  smx,
  smy,
}: {
  coin: Coin;
  index: number;
  smx: MotionValue<number>;
  smy: MotionValue<number>;
}) {
  const px = useTransform(smx, (v) => v * c.depth);
  const py = useTransform(smy, (v) => v * c.depth);
  return (
    <motion.div
      style={{ x: px, y: py, left: `${c.x}%`, top: `${c.y}%` }}
      className="absolute"
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.8,
        delay: i * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, c.spin, 0] }}
        transition={{
          duration: 4 + i * 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.2,
        }}
        className="flex flex-col items-center gap-1"
      >
        <div
          className="flex items-center justify-center rounded-full font-semibold text-white"
          style={{
            width: c.size,
            height: c.size,
            background:
              "linear-gradient(135deg, #0052ff, #0042cc)",
            fontSize: c.size * 0.42,
            boxShadow:
              "inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.25), 0 12px 24px -8px rgba(0, 82, 255, 0.5)",
          }}
        >
          {c.glyph}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {c.label}
        </span>
      </motion.div>
    </motion.div>
  );
}
