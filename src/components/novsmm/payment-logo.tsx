"use client";

import { cn } from "@/lib/utils";

/**
 * Payment method logos — uses branded gradient pills with glyphs.
 *
 * Previously loaded SVG files from /payment-logos/ which caused:
 *   - Broken images when files weren't served correctly
 *   - Layout shift while loading
 *   - Additional HTTP requests
 *
 * Now uses styled gradient pills with brand-colored backgrounds and
 * the provider's initial(s). Renders instantly, zero network requests.
 */

type PaymentLogoProps = {
  name: string;
  size?: number;
  className?: string;
};

// Brand colors and glyphs for each payment method
const PAYMENT_BRAND: Record<string, { glyph: string; bg: string; text: string }> = {
  PayPal: { glyph: "P", bg: "bg-blue-500", text: "text-white" },
  "Mercado Pago": { glyph: "MP", bg: "bg-cyan-500", text: "text-white" },
  NowPayments: { glyph: "₿", bg: "bg-amber-500", text: "text-white" },
  Manual: { glyph: "W", bg: "bg-green-500", text: "text-white" },
  Stripe: { glyph: "S", bg: "bg-violet-600", text: "text-white" },
};

/**
 * Payment method logo — renders a branded gradient pill instantly.
 */
export function PaymentLogo({ name, size = 32, className }: PaymentLogoProps) {
  const brand = PAYMENT_BRAND[name];
  const glyph = brand?.glyph ?? name.charAt(0).toUpperCase();
  const bg = brand?.bg ?? "bg-gradient-to-br from-primary to-primary/70";
  const text = brand?.text ?? "text-primary-foreground";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold",
        bg,
        text,
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name}
      role="img"
    >
      {glyph}
    </span>
  );
}

/**
 * Get the glyph fallback for a payment method.
 */
export function getPaymentGlyph(name: string): string {
  return PAYMENT_BRAND[name]?.glyph ?? name.charAt(0).toUpperCase();
}
