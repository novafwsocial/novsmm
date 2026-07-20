"use client";

import { Reveal } from "@/components/novsmm/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center"
          ? "items-center text-center"
          : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-md">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.06}>
        <h2
          className={cn(
            "text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-balance",
            align === "center" ? "max-w-3xl" : "max-w-4xl"
          )}
        >
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.12}>
          <p
            className={cn(
              "max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg",
              align === "center" ? "mx-auto" : "max-w-3xl"
            )}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
