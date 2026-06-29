"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PLATFORMS, type Platform } from "./platforms";
import { SectionHeading } from "./section-heading";
import { Reveal, RevealStagger, RevealItem } from "./reveal";

export function Services() {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Services"
          title={
            <>
              Every platform. Every metric.
              <br className="hidden sm:block" /> One control surface.
            </>
          }
          description="From follower growth to watch-time, NOVSMM orchestrates 240+ services across the platforms your audience actually lives on — with sub-2-second order start times."
        />

        <RevealStagger
          stagger={0.05}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {PLATFORMS.map((p) => (
            <RevealItem key={p.name} blur>
              <ServiceCard platform={p} />
            </RevealItem>
          ))}
          {/* Aggregate card */}
          <RevealItem blur>
            <div className="group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30 p-5 transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  + 30 more
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">263</div>
                <div className="text-xs text-muted-foreground">
                  total active services
                </div>
              </div>
            </div>
          </RevealItem>
        </RevealStagger>
      </div>
    </section>
  );
}

function ServiceCard({ platform }: { platform: Platform }) {
  // pointer-follow glow
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const background = useMotionTemplate`radial-gradient(220px circle at ${mx}% ${my}%, rgba(0, 82, 255, 0.08), transparent 60%)`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-background p-5 transition-shadow hover:nov-ring-lg"
    >
      <motion.div
        aria-hidden
        style={{ background }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
          <platform.Icon className="h-5 w-5" />
        </span>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {platform.services} svc
        </span>
      </div>
      <div className="relative">
        <div className="text-base font-semibold text-foreground">
          {platform.name}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {platform.blurb}
        </p>
      </div>
    </motion.div>
  );
}
