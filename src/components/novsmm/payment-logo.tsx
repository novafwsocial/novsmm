"use client";

import { cn } from "@/lib/utils";

/**
 * Payment method logos — official SVG brand marks.
 * Vector, zero network requests, instant render.
 */

type PaymentLogoProps = {
  name: string;
  size?: number;
  className?: string;
};

export function PaymentLogo({ name, size = 32, className }: PaymentLogoProps) {
  const iconSize = size * 0.6;

  const renderLogo = () => {
    const lower = name.toLowerCase();

    // PayPal
    if (lower.includes("paypal")) {
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path d="M7.5 6h5.7c2.4 0 4.3 1.6 4.3 4.2 0 3-2.3 4.8-5.4 4.8H9.7l-.7 4H6.5l1-9z" fill="#003087"/>
          <path d="M8.4 6h5.7c2.4 0 4.3 1.6 4.3 4.2 0 3-2.3 4.8-5.4 4.8h-2.4l-.7 4H7.4l1-9z" fill="#009cde"/>
          <path d="M12.3 8.2c1.5 0 2.6.8 2.6 2.3 0 1.8-1.5 2.8-3.3 2.8h-1.5l.5-5.1h1.7z" fill="#012169"/>
        </svg>
      );
    }

    // Mercado Pago
    if (lower.includes("mercado")) {
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#00b1ea"/>
          <path d="M7 13.5c0-.3.1-.5.4-.5h2.2c.2 0 .4.2.4.5 0 1.2.9 2 2.3 2 1.1 0 1.9-.5 1.9-1.4 0-.8-.5-1.1-1.7-1.5l-1.8-.6c-2-.7-3-1.7-3-3.5 0-2.2 1.9-3.5 4.3-3.5 2.5 0 4.2 1.4 4.3 3.6 0 .3-.1.5-.4.5h-2.2c-.2 0-.4-.2-.4-.4 0-.9-.7-1.5-1.6-1.5s-1.5.5-1.5 1.2c0 .7.5 1 1.6 1.4l1.6.5c2.2.7 3.3 1.7 3.3 3.7 0 2.4-2 3.9-4.6 3.9-3 .1-5-1.5-5-4.3z" fill="#fff"/>
        </svg>
      );
    }

    // NowPayments (crypto)
    if (lower.includes("now")) {
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#1a1a2e"/>
          <path d="M12 6l1.5 4.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-1.5L12 6z" fill="#5dc9bc"/>
        </svg>
      );
    }

    // Manual / WhatsApp / Zelle / Wire
    if (lower.includes("manual") || lower.includes("whatsapp") || lower.includes("zelle") || lower.includes("wire")) {
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#25D366"/>
          <path d="M12 6c-3.3 0-6 2.7-6 6 0 1 .3 2 .7 2.8L6 18l3.3-.9c.8.4 1.7.6 2.7.6 3.3 0 6-2.7 6-6s-2.7-6-6-6z" fill="#fff"/>
          <path d="M9.5 8.5c-.2 0-.4.1-.5.3-.2.2-.5.5-.5 1 0 .6.4 1.2.5 1.4.1.2 1 1.6 2.5 2.2 1.2.5 1.5.4 1.7.4.3-.1.7-.3.8-.6.1-.3.1-.6.1-.6-.1-.1-.3-.2-.5-.3l-.7-.3c-.1-.1-.2-.1-.3 0l-.4.5c-.1.1-.2.1-.3 0-.3-.1-.8-.3-1.3-.8-.4-.4-.6-.8-.7-1-.1-.1 0-.2.1-.3l.2-.3c.1-.1.1-.2 0-.3l-.3-.7c0-.2-.2-.3-.3-.3z" fill="#25D366"/>
        </svg>
      );
    }

    // Stripe
    if (lower.includes("stripe")) {
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path d="M13.5 6.5c0-1 .8-1.5 2-1.5.8 0 1.7.2 2.5.5V2c-.9-.3-1.8-.5-3-.5-3 0-5 1.5-5 4v2H8v3.5h2V22h3.5v-11h2.5l.5-3.5h-3v-1z" fill="#635bff"/>
        </svg>
      );
    }

    // Default — generic card icon
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    );
  };

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-label={name}
      role="img"
    >
      {renderLogo()}
    </span>
  );
}
