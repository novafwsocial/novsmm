"use client";

import { cn } from "@/lib/utils";

/**
 * Platform logos — uses emoji by default (zero network requests, instant render).
 *
 * Previously loaded from Google's favicon service (https://www.google.com/s2/favicons)
 * which caused:
 *   - 20+ external requests per page (slow on mobile)
 *   - Broken images when Google rate-limits or is unreachable
 *   - Layout shift while images loaded
 *   - Privacy concerns (leaking user IPs to Google)
 *
 * Now uses high-quality emoji that render instantly on all platforms.
 * For brands with distinct colors, a colored background is applied.
 */

const PLATFORM_DATA: Record<string, { emoji: string; bg?: string }> = {
  Instagram: { emoji: "📷", bg: "bg-gradient-to-br from-pink-500/20 to-purple-500/20" },
  TikTok: { emoji: "🎵", bg: "bg-gradient-to-br from-gray-900/20 to-pink-500/20" },
  YouTube: { emoji: "▶️", bg: "bg-red-500/10" },
  Facebook: { emoji: "👤", bg: "bg-blue-500/10" },
  Telegram: { emoji: "✈️", bg: "bg-sky-500/10" },
  Spotify: { emoji: "🎧", bg: "bg-green-500/10" },
  X: { emoji: "🐦", bg: "bg-gray-500/10" },
  Twitch: { emoji: "🎮", bg: "bg-purple-500/10" },
  Discord: { emoji: "💬", bg: "bg-indigo-500/10" },
  Kick: { emoji: "🟢", bg: "bg-green-500/10" },
  WhatsApp: { emoji: "💬", bg: "bg-green-500/10" },
  LinkedIn: { emoji: "💼", bg: "bg-blue-600/10" },
  Threads: { emoji: "🧵", bg: "bg-gray-700/10" },
  Snapchat: { emoji: "👻", bg: "bg-yellow-400/10" },
  Pinterest: { emoji: "📌", bg: "bg-red-600/10" },
  Reddit: { emoji: "🤖", bg: "bg-orange-500/10" },
  Google: { emoji: "🔍", bg: "bg-blue-500/10" },
  SoundCloud: { emoji: "☁️", bg: "bg-orange-400/10" },
  Vimeo: { emoji: "🎥", bg: "bg-blue-400/10" },
  Shopee: { emoji: "🛒", bg: "bg-orange-500/10" },
  Tumblr: { emoji: "📝", bg: "bg-blue-900/10" },
  Other: { emoji: "🌐" },
  Website: { emoji: "🌐" },
  SEO: { emoji: "📊" },
  Traffic: { emoji: "🚦" },
};

type PlatformLogoProps = {
  platform: string;
  size?: number;
  className?: string;
  rounded?: boolean;
};

/**
 * Platform logo — renders an emoji instantly (no network requests).
 */
export function PlatformLogo({
  platform,
  size = 24,
  className,
  rounded = true,
}: PlatformLogoProps) {
  const data = PLATFORM_DATA[platform] ?? { emoji: "🌐" };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        rounded ? "rounded-lg" : "",
        data.bg ?? "",
        className
      )}
      style={{ fontSize: size * 0.7, width: size, height: size }}
      aria-label={platform}
      role="img"
    >
      {data.emoji}
    </span>
  );
}

/**
 * Get the emoji for a platform.
 */
export function getPlatformEmoji(platform: string): string {
  return PLATFORM_DATA[platform]?.emoji ?? "🌐";
}

/**
 * Get the official logo URL for a platform (kept for backward compat, returns null).
 */
export function getPlatformLogoUrl(_platform: string): string | null {
  return null; // No external URLs — using emoji for performance
}
