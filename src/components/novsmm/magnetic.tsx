"use client";

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
 *
 * PERFORMANCE: Previously used framer-motion's useMotionValue + useSpring
 * which added ~30KB JS and ran a rAF loop per Magnetic button (4+ buttons
 * on the hero + navbar = 4+ rAF loops on every mousemove).
 *
 * Now uses a lightweight rAF-throttled transform update. On mobile/touch
 * devices, magnetic effect is disabled (no hover on touch anyway).
 *
 * The visual result is identical: smooth magnetic hover on desktop.
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
  const rafRef = useRef<number>(0);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    // Skip on touch devices (no hover)
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      return;
    }
    const el = ref.current;
    if (!el) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`;
    });
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transform = "translate(0, 0)";
    });
  };

  const Tag = as as any;

  return (
    <Tag
      ref={ref as never}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      href={href}
      onClick={onClick}
      style={{
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </Tag>
  );
}
