"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: boolean;
  scale?: boolean;
  once?: boolean;
};

/**
 * Scroll Reveal — supports blur-reveal and scale-reveal variants.
 * GPU-accelerated, respects initial paint for SSR.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  blur = false,
  scale = false,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-10% 0px -10% 0px" });

  const initial: Record<string, number | string> = { opacity: 0, y };
  if (blur) initial.filter = "blur(12px)";
  if (scale) initial.scale = 0.96;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={
        inView
          ? {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              scale: 1,
            }
          : initial
      }
      transition={{
        duration: 0.9,
        delay,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.7, delay },
        filter: { duration: 0.9, delay },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered container — children must be <RevealStagger.Item>.
 */
export function RevealStagger({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={container}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  y = 20,
  blur = false,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  blur?: boolean;
}) {
  const item: Variants = {
    hidden: { opacity: 0, y, filter: blur ? "blur(10px)" : "blur(0px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
