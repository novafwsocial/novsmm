"use client";

import { useRef, type ReactNode } from "react";

type Tilt3DProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
};

/**
 * 3D card tilt — element follows the mouse with perspective rotation.
 * Desktop only (disabled on touch devices for performance + no hover).
 * Uses rAF-throttled transform updates (no per-pixel re-render).
 */
export function Tilt3D({ children, className = "", maxTilt = 8 }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip on touch devices
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      return;
    }
    // P3 FIX: Respect prefers-reduced-motion and saveData
    if (typeof window !== "undefined") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const conn = (navigator as any).connection;
      if (conn?.saveData) return;
    }
    const el = ref.current;
    if (!el) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const tiltX = (y - 0.5) * -2 * maxTilt;
      const tiltY = (x - 0.5) * 2 * maxTilt;
      el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
    });
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
    });
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="tilt-card-inner">
        {children}
      </div>
    </div>
  );
}
