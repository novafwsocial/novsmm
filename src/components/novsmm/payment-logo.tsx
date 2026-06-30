"use client";

import { cn } from "@/lib/utils";

/**
 * Official payment method logos.
 * Uses Google's favicon service to fetch official logos from each payment provider's website.
 */

const PAYMENT_DOMAINS: Record<string, string> = {
  Stripe: "stripe.com",
  PayPal: "paypal.com",
  "Mercado Pago": "mercadopago.com",
  "Aurora Pay": "aurora-pay.com",
  Crypto: "coinbase.com",
  "Bank transfer": "wise.com",
};

const PAYMENT_GLYPHS: Record<string, string> = {
  Stripe: "S",
  PayPal: "P",
  "Mercado Pago": "MP",
  "Aurora Pay": "A",
  Crypto: "₿",
  "Bank transfer": "🏦",
};

type PaymentLogoProps = {
  name: string;
  size?: number;
  className?: string;
};

/**
 * Payment method logo — loads the official logo from Google's favicon service.
 */
export function PaymentLogo({ name, size = 32, className }: PaymentLogoProps) {
  const domain = PAYMENT_DOMAINS[name];
  const glyph = PAYMENT_GLYPHS[name] ?? name.charAt(0).toUpperCase();

  if (!domain) {
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

  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${Math.max(size * 2, 64)}`;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="h-full w-full object-contain p-1"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.textContent = glyph;
            parent.style.fontSize = `${size * 0.4}px`;
            parent.style.fontWeight = "600";
            parent.style.color = "var(--primary)";
          }
        }}
      />
    </span>
  );
}

/**
 * Get the glyph fallback for a payment method.
 */
export function getPaymentGlyph(name: string): string {
  return PAYMENT_GLYPHS[name] ?? name.charAt(0).toUpperCase();
}
