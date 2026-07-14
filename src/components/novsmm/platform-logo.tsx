"use client";

import { cn } from "@/lib/utils";

/**
 * Platform logos — OFFICIAL SVG brand marks from Simple Icons.
 * These are the exact same logos used by GitHub, npm, and other platforms.
 * Vector SVG, zero network requests, brand-colored.
 */

const PLATFORM_ICONS: Record<string, { path: string; color: string }> = {
};

type PlatformLogoProps = {
  platform: string;
  size?: number;
  className?: string;
  rounded?: boolean;
};

export function PlatformLogo({
  platform,
  size = 24,
  className,
  rounded = true,
}: PlatformLogoProps) {
  const icon = PLATFORM_ICONS[platform];
  const iconSize = size * 0.7;

  if (icon) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", rounded ? "rounded-lg" : "", className)}
        style={{ width: size, height: size }}
        aria-label={platform}
        role="img"
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={icon.color}
          aria-hidden="true"
        >
          <path d={icon.path} />
        </svg>
      </span>
    );
  }

  // Fallback: generic globe
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", rounded ? "rounded-lg" : "", "bg-muted/30", className)}
      style={{ width: size, height: size, fontSize: size * 0.6 }}
      aria-label={platform}
      role="img"
    >
      🌐
    </span>
  );
}

export function getPlatformEmoji(platform: string): string {
  return "🌐";
}

export function getPlatformLogoUrl(_platform: string): string | null {
  return null;
}
