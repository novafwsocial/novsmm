"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * ScrollProgress — top-of-viewport scroll progress indicator.
 * Implemented using Framer Motion with spring physics for a premium feel.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed left-0 top-0 z-[60] h-[3px] w-full origin-left bg-foreground"
    />
  );
}
