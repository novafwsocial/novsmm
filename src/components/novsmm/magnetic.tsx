"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";

type MagneticProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
  as?: "div" | "button" | "a";
  href?: string;
  onClick?: () => void;
};

/**
 * Magnetic Hover — element subtly follows the cursor with spring physics.
 * Used for CTAs, icons, and interactive cards.
 */
export function Magnetic({
  children,
  className,
  strength = 0.35,
  as = "div",
  href,
  onClick,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const MotionComp = motion[as];

  return (
    <MotionComp
      ref={ref as never}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMove as any}
      onMouseLeave={handleLeave}
      href={href as never}
      onClick={onClick}
    >
      {children}
    </MotionComp>
  );
}

/**
 * TiltCard — 3D mouse tilt with perspective and depth layers.
 */
export function TiltCard({
  children,
  className,
  max = 8,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });

  const rotateX = useTransform(srx, (v) => `${v}deg`);
  const rotateY = useTransform(sry, (v) => `${v}deg`);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rx.set((0.5 - py) * max * 2);
    ry.set((px - 0.5) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  const handleLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  // Glare background — hoisted so the hook order is stable.
  const glareBg = useTransform(
    [gx, gy],
    ([xv, yv]) =>
      `radial-gradient(circle at ${xv}% ${yv}%, rgba(0, 82, 255, 0.10), transparent 55%)`
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}
