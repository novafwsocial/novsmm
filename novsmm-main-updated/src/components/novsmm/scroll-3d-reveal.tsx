"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

type Scroll3DRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * 3D scroll reveal — cards rotate in from perspective on scroll.
 * Re-implemented using Framer Motion with spring physics.
 */
export function Scroll3DReveal({ children, className = "", delay = 0 }: Scroll3DRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-5% 0px -5% 0px", amount: 0.1 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 60, rotateX: 15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 60, rotateX: 15 }}
      transition={{ 
        type: "spring", 
        stiffness: 80, 
        damping: 20, 
        delay,
        mass: 0.8
      }}
      style={{ perspective: 800, transformOrigin: "center bottom" }}
    >
      {children}
    </motion.div>
  );
}
