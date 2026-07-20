"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Scroll3DRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * 3D scroll reveal — cards rotate in from perspective on scroll.
 * Migrated from framer-motion to IntersectionObserver + CSS.
 */
export function Scroll3DReveal({ children, className = "", delay = 0 }: Scroll3DRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (isMobile || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-5% 0px -5% 0px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isMobile]);

  if (isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        perspective: 800,
        transformOrigin: "center bottom",
        transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
        transitionDelay: `${delay}s`,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) rotateX(0deg)" : "translateY(60px) rotateX(15deg)",
      }}
    >
      {children}
    </div>
  );
}
