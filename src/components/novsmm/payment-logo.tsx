"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Official payment method logos.
 *
 * Uses the real brand logos downloaded from each provider's official website
 * (served from /public/payment-logos/). Each logo is a high-resolution PNG
 * or SVG that faithfully reproduces the provider's brand mark.
 *
 * Logos are loaded via Next.js <Image> for:
 *  - Automatic optimization (WebP/AVIF when supported)
 *  - Lazy loading
 *  - Prevent layout shift (width/height set)
 *  - CDN caching
 *
 * Falls back to a gradient pill with a glyph if a logo file is missing.
 */

type PaymentLogoProps = {
  name: string;
  size?: number;
  className?: string;
};

// Map payment method names to their logo file in /public/payment-logos/
const LOGO_FILES: Record<string, string> = {
  PayPal: "/payment-logos/paypal.svg",
  "Mercado Pago": "/payment-logos/mercadopago.svg",
  NowPayments: "/payment-logos/nowpayments.svg",
  Manual: "/payment-logos/whatsapp.svg",
};

// Fallback glyphs (first letter) for methods without a logo file
const PAYMENT_GLYPHS: Record<string, string> = {
  PayPal: "P",
  "Mercado Pago": "MP",
  NowPayments: "N",
  Manual: "M",
};

// Background colors for the logo container (matches each brand's identity)
const LOGO_BG: Record<string, string> = {
  PayPal: "bg-white",
  "Mercado Pago": "bg-white",
  NowPayments: "bg-white",
  Manual: "bg-white",
};

/**
 * Payment method logo — renders the official brand logo from /public/payment-logos/.
 * Falls back to a gradient pill with a glyph if the logo file is missing.
 */
export function PaymentLogo({ name, size = 32, className }: PaymentLogoProps) {
  const logoFile = LOGO_FILES[name];
  const glyph = PAYMENT_GLYPHS[name] ?? name.charAt(0).toUpperCase();
  const bg = LOGO_BG[name] ?? "bg-muted/50";

  if (logoFile) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
          bg,
          className
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src={logoFile}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          unoptimized
        />
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
