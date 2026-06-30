"use client";

import { cn } from "@/lib/utils";

/**
 * Official platform logos.
 * Uses Google's favicon service which fetches official logos from each platform's website.
 * Falls back to an emoji if the image fails to load.
 *
 * Google favicons: https://www.google.com/s2/favicons?domain=DOMAIN&sz=128
 * This service crawls each website and extracts the official favicon/logo at high resolution.
 */

const PLATFORM_DOMAINS: Record<string, string> = {
  Instagram: "instagram.com",
  TikTok: "tiktok.com",
  YouTube: "youtube.com",
  Facebook: "facebook.com",
  Telegram: "telegram.org",
  Spotify: "spotify.com",
  X: "twitter.com",
  Twitch: "twitch.tv",
  Discord: "discord.com",
  Kick: "kick.com",
  WhatsApp: "whatsapp.com",
  LinkedIn: "linkedin.com",
  Threads: "threads.net",
  Snapchat: "snapchat.com",
  Pinterest: "pinterest.com",
  Reddit: "reddit.com",
  Google: "google.com",
  SoundCloud: "soundcloud.com",
  Vimeo: "vimeo.com",
  Shopee: "shopee.com",
  Tumblr: "tumblr.com",
};

const PLATFORM_EMOJI_FALLBACK: Record<string, string> = {
  Instagram: "📷",
  TikTok: "🎵",
  YouTube: "▶️",
  Facebook: "👤",
  Telegram: "✈️",
  Spotify: "🎧",
  X: "🐦",
  Twitch: "🎮",
  Discord: "💬",
  Kick: "🟢",
  WhatsApp: "💬",
  LinkedIn: "💼",
  Threads: "🧵",
  Snapchat: "👻",
  Pinterest: "📌",
  Reddit: "🤖",
  Google: "🔍",
  SoundCloud: "☁️",
  Vimeo: "🎥",
  Shopee: "🛒",
  Tumblr: "📝",
  Other: "🌐",
  Website: "🌐",
  SEO: "📊",
  Traffic: "🚦",
};

type PlatformLogoProps = {
  platform: string;
  size?: number;
  className?: string;
  rounded?: boolean;
};

/**
 * Platform logo component — loads the official logo from Google's favicon service.
 * Shows a colored emoji fallback while loading or if the image fails.
 */
export function PlatformLogo({
  platform,
  size = 24,
  className,
  rounded = true,
}: PlatformLogoProps) {
  const domain = PLATFORM_DOMAINS[platform];
  const fallback = PLATFORM_EMOJI_FALLBACK[platform] ?? "🌐";

  if (!domain) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        style={{ fontSize: size * 0.7, width: size, height: size }}
      >
        {fallback}
      </span>
    );
  }

  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${Math.max(size * 2, 64)}`;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        rounded ? "rounded-lg" : "",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt={platform}
        width={size}
        height={size}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={(e) => {
          // Replace with emoji fallback on error
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.textContent = fallback;
            parent.style.fontSize = `${size * 0.7}px`;
          }
        }}
      />
    </span>
  );
}

/**
 * Get the emoji fallback for a platform.
 */
export function getPlatformEmoji(platform: string): string {
  return PLATFORM_EMOJI_FALLBACK[platform] ?? "🌐";
}

/**
 * Get the official logo URL for a platform.
 */
export function getPlatformLogoUrl(platform: string): string | null {
  const domain = PLATFORM_DOMAINS[platform];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
