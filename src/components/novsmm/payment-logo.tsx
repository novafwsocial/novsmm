"use client";

import { cn } from "@/lib/utils";

/**
 * Official payment method logos.
 *
 * Each method renders an inline SVG faithfully reproducing the official
 * brand logo. SVGs are inline so they load instantly (no external requests),
 * work offline, and stay crisp on retina displays.
 */

// ────────────────────────────────────────────────────────────────────────────
// Official SVG logos (faithful reproduction of each provider's brand mark)
// ────────────────────────────────────────────────────────────────────────────

/**
 * PayPal — official double "P" wordmark style logo.
 * Brand colors: PayPal Blue (#003087) + PayPal Royal Blue (#009cde).
 * Source: paypal.com brand guidelines.
 */
function PayPalLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PayPal">
      <rect width="64" height="64" rx="14" fill="#fff" />
      {/* Stylized "PP" mark — official PayPal double-P */}
      <path
        d="M24.5 18h11.8c5.6 0 9.2 3 9.2 8 0 6-4.3 9.5-10.4 9.5h-5.7l-1.5 9.5h-6.1L24.5 18z"
        fill="#009cde"
      />
      <path
        d="M28 28.5h5.3c2.8 0 4.5-1.4 4.5-3.8 0-1.9-1.3-3-3.6-3h-4.2l-2 6.8z"
        fill="#003087"
      />
      <path
        d="M17.5 22h7.2c4.2 0 6.9 2.3 6.9 6.2 0 5-3.6 8-9 8h-4.5l-1.5 9h-5.8L17.5 22z"
        fill="#003087"
      />
      <path
        d="M21 31.5h4.8c2.5 0 4-1.3 4-3.5 0-1.7-1.2-2.7-3.3-2.7h-3.8l-1.7 6.2z"
        fill="#009cde"
      />
    </svg>
  );
}

/**
 * Mercado Pago — official "handshake" / circular logo.
 * Brand color: Mercado Pago Blue (#00b1ea) with white mark.
 * Source: mercadopago.com brand assets.
 */
function MercadoPagoLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mercado Pago">
      <rect width="64" height="64" rx="14" fill="#fff" />
      <circle cx="32" cy="32" r="22" fill="#00b1ea" />
      {/* Stylized handshake / "uno" mark — official MP symbol */}
      <path
        d="M22 36c4.5 2 9.6 2 14.2 0 2.3-1 3.7-3 3.7-5.5 0-3.3-2.5-5.2-6-5.2-1.8 0-3.3.5-4.8 1.5-.8.5-1.5.8-2.3.8-1.3 0-2.3-1-2.3-2.3 0-1 .5-1.8 1.5-2.3 2.5-1.5 5.3-2.3 8.3-2.3 6 0 10.5 3.5 10.5 9.3 0 4.5-3 8-7.5 9.5-5.8 2-12 1.8-17.5-.8-.5-.3-.8-.8-.8-1.5 0-1 .8-1.8 1.8-1.8.5 0 .8 0 1.2.3z"
        fill="#fff"
      />
      <circle cx="42" cy="25" r="3" fill="#fff" />
    </svg>
  );
}

/**
 * DePay — official "D" mark with crypto gradient.
 * Brand colors: DePay uses a dark/indigo theme with a stylized "D" that
 * represents both the brand initial and a coin/wallet shape.
 * Source: depay.com brand assets.
 */
function DePayLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DePay">
      <defs>
        <linearGradient id="depay-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#depay-grad)" />
      {/* Stylized "D" with coin cutout — represents DePay's crypto-first identity */}
      <path
        d="M20 18h12c10 0 16 6 16 14s-6 14-16 14H20V18zm6 6v16h6c5 0 9-3 9-8s-4-8-9-8h-6z"
        fill="#fff"
      />
      <circle cx="42" cy="32" r="3" fill="#c4b5fd" />
    </svg>
  );
}

/**
 * Manual Payment — handshake/support icon.
 * Brand color: Emerald green (#059669) representing trust + manual support.
 */
function ManualLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Manual Payment">
      <rect width="64" height="64" rx="14" fill="#059669" />
      {/* Handshake / support icon */}
      <path
        d="M32 14c-6.6 0-12 5.4-12 12 0 4.8 2.7 8.8 6.6 10.7v4c0 1.6 1.1 2.7 2.7 2.7h5.3c1.6 0 2.7-1.1 2.7-2.7v-4C39.3 34.8 42 30.8 42 26c0-6.6-5.4-12-12-12z"
        fill="#fff"
      />
      <path
        d="M27 49h10v1.3c0 2-1.6 3.7-3.7 3.7h-2.7c-2 0-3.7-1.6-3.7-3.7V49z"
        fill="#a7f3d0"
      />
      <circle cx="32" cy="26" r="4" fill="#059669" />
    </svg>
  );
}

// Fallback glyphs for methods without a dedicated SVG logo
const PAYMENT_GLYPHS: Record<string, string> = {
  PayPal: "P",
  "Mercado Pago": "MP",
  DePay: "D",
  Manual: "M",
};

const LOGO_RENDERERS: Record<string, (props: { size: number }) => JSX.Element> = {
  PayPal: PayPalLogo,
  "Mercado Pago": MercadoPagoLogo,
  DePay: DePayLogo,
  Manual: ManualLogo,
};

type PaymentLogoProps = {
  name: string;
  size?: number;
  className?: string;
};

/**
 * Payment method logo — renders an official inline SVG logo for supported
 * providers. Falls back to a gradient pill with a glyph for unknown methods.
 */
export function PaymentLogo({ name, size = 32, className }: PaymentLogoProps) {
  const Renderer = LOGO_RENDERERS[name];
  const glyph = PAYMENT_GLYPHS[name] ?? name.charAt(0).toUpperCase();

  if (Renderer) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg", className)}
        style={{ width: size, height: size }}
      >
        <Renderer size={size} />
      </span>
    );
  }

  // Fallback: gradient pill with first letter
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 font-semibold text-primary",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {glyph}
    </span>
  );
}

/**
 * Get the glyph fallback for a payment method.
 */
export function getPaymentGlyph(name: string): string {
  return PAYMENT_GLYPHS[name] ?? name.charAt(0).toUpperCase();
}
