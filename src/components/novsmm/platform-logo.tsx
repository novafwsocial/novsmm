"use client";

import { cn } from "@/lib/utils";
import {
  InstagramMark,
  TikTokMark,
  FacebookMark,
  YouTubeMark,
  TelegramMark,
  DiscordMark,
  SpotifyMark,
  ThreadsMark,
  XMark,
  KickMark,
  TwitchMark,
} from "./platforms";

/**
 * Platform logos — uses official SVG brand marks (vector, zero network requests).
 *
 * Each platform gets its official brand-colored SVG logo.
 * Falls back to a generic globe icon for unknown platforms.
 */

// Brand colors for background
const PLATFORM_BG: Record<string, string> = {
  Instagram: "bg-gradient-to-br from-pink-500/10 to-purple-500/10",
  TikTok: "bg-gradient-to-br from-gray-900/5 to-pink-500/5",
  YouTube: "bg-red-500/5",
  Facebook: "bg-blue-500/5",
  Telegram: "bg-sky-500/5",
  Spotify: "bg-green-500/5",
  X: "bg-gray-500/5",
  Twitch: "bg-purple-500/5",
  Discord: "bg-indigo-500/5",
  Kick: "bg-green-500/5",
  WhatsApp: "bg-green-500/5",
  LinkedIn: "bg-blue-600/5",
  Threads: "bg-gray-700/5",
  Snapchat: "bg-yellow-400/5",
  Pinterest: "bg-red-600/5",
  Reddit: "bg-orange-500/5",
  SoundCloud: "bg-orange-400/5",
  Vimeo: "bg-blue-400/5",
  Shopee: "bg-orange-500/5",
  Tumblr: "bg-blue-900/5",
};

type PlatformLogoProps = {
  platform: string;
  size?: number;
  className?: string;
  rounded?: boolean;
};

/**
 * Platform logo — renders the official SVG brand mark.
 */
export function PlatformLogo({
  platform,
  size = 24,
  className,
  rounded = true,
}: PlatformLogoProps) {
  const bg = PLATFORM_BG[platform] ?? "";
  const iconSize = size * 0.65;

  const renderMark = () => {
    const props = { width: iconSize, height: iconSize };
    switch (platform) {
      case "Instagram": return <InstagramMark {...props} />;
      case "TikTok": return <TikTokMark {...props} />;
      case "Facebook": return <FacebookMark {...props} />;
      case "YouTube": return <YouTubeMark {...props} />;
      case "Telegram": return <TelegramMark {...props} />;
      case "Discord": return <DiscordMark {...props} />;
      case "Spotify": return <SpotifyMark {...props} />;
      case "Threads": return <ThreadsMark {...props} />;
      case "X": return <XMark {...props} />;
      case "Kick": return <KickMark {...props} />;
      case "Twitch": return <TwitchMark {...props} />;
      case "WhatsApp":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
            <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 14.8 3.7 13.4 3.7 12c0-4.6 3.7-8.3 8.3-8.3s8.3 3.7 8.3 8.3-3.7 8.3-8.3 8.3z"/>
            <path d="M16.5 14.3c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.1-.3.2-.5.1-.7-.3-1.5-.7-2.3-1.5-.6-.5-1-1.2-1.2-1.4-.1-.2 0-.4.1-.5l.4-.4.2-.3v-.3c0-.1-.6-1.4-.8-1.9-.1-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 2 0 1.2.8 2.3 1 2.5.1.1 1.7 2.6 4.1 3.6 1.5.6 2.1.7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3z"/>
          </svg>
        );
      case "LinkedIn":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8.3 18.3H5.7v-8.3h2.6v8.3zM7 8.8c-.8 0-1.5-.7-1.5-1.5S6.2 5.8 7 5.8s1.5.7 1.5 1.5S7.8 8.8 7 8.8zm11.3 9.5h-2.6v-4.5c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4v4.6h-2.6v-8.3h2.5v1.1h.1c.3-.6 1.2-1.3 2.4-1.3 2.6 0 3.1 1.7 3.1 3.9v4.6z"/>
          </svg>
        );
      case "Snapchat":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
            <path d="M12 2c2.5 0 4.5 2 4.5 4.5 0 .5 0 1-.1 1.5.3.2.7.2 1 .1.5-.1 1 .2 1 .7 0 .6-.8 1.2-1.5 1.5.1.5.4 1.2.9 1.9.8 1 1.8 1.7 3 2 .3.1.5.3.5.6 0 .6-1.5 1.1-2.3 1.3-.1.2-.2.5-.3.7-.1.2-.3.3-.5.3-.4 0-1-.2-1.7-.2-.5 0-1 .1-1.5.4-.8.6-1.6 1.3-3 1.3s-2.2-.7-3-1.3c-.5-.3-1-.4-1.5-.4-.7 0-1.3.2-1.7.2-.2 0-.4-.1-.5-.3-.1-.2-.2-.5-.3-.7-.8-.2-2.3-.7-2.3-1.3 0-.3.2-.5.5-.6 1.2-.3 2.2-1 3-2 .5-.7.8-1.4.9-1.9-.7-.3-1.5-.9-1.5-1.5 0-.5.5-.8 1-.7.3.1.7.1 1-.1-.1-.5-.1-1-.1-1.5C7.5 4 9.5 2 12 2z"/>
          </svg>
        );
      case "Pinterest":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-red-600">
            <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.3-.1-.8-.2-2 0-2.9.1-.5 1-4.2 1-4.2s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.7 0 1.1.6 1.1 1.3 0 .8-.5 1.9-.8 3-.2.7.4 1.3 1.1 1.3 1.3 0 2.3-1.4 2.3-3.5 0-1.8-1.3-3.1-3.2-3.1-2.2 0-3.5 1.6-3.5 3.3 0 .7.3 1.4.6 1.8.1.1.1.1.1.2-.1.3-.2.8-.2.9-.1.1-.2.2-.4.1-1.1-.5-1.8-2.2-1.8-3.5 0-2.9 2.1-5.5 6-5.5 3.1 0 5.6 2.2 5.6 5.2 0 3.1-2 5.6-4.7 5.6-.9 0-1.8-.5-2.1-1l-.6 2.2c-.2.8-.8 1.8-1.2 2.5.9.3 1.9.5 2.9.5 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
          </svg>
        );
      case "Reddit":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-orange-500">
            <path d="M22 12c0-1.2-1-2.2-2.2-2.2-.6 0-1.1.2-1.5.6-1.5-1-3.5-1.7-5.7-1.8l1-4.6 3.2.7c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4-.6-1.4-1.4-1.4c-.5 0-1 .3-1.3.8l-3.6-.8c-.1 0-.2 0-.3.1-.1.1-.1.2-.2.3l-1.1 5c-2.2.1-4.2.7-5.7 1.8-.4-.4-.9-.6-1.5-.6C2.9 9.8 2 10.8 2 12c0 .9.5 1.6 1.2 2-.1.2-.1.5-.1.8 0 2.6 3 4.7 6.8 4.7s6.8-2.1 6.8-4.7c0-.3 0-.5-.1-.8.6-.4 1.4-1.1 1.4-2zm-14.5.5c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4-.6 1.4-1.4 1.4-1.4-.6-1.4-1.4zm7.6 3.6c-.9.9-2.6 1-3.1 1s-2.2-.1-3.1-1c-.1-.1-.1-.3 0-.5.1-.1.3-.1.5 0 .6.6 1.8.8 2.6.8s2.1-.2 2.6-.8c.1-.1.3-.1.5 0 .1.2.1.4 0 .5zm-.2-2.2c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4 1.4.6 1.4 1.4-.6 1.4-1.4 1.4z"/>
          </svg>
        );
      case "SoundCloud":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
            <path d="M1 14h1v5H1zm2-2h1v7H3zm2-1h1v8H5zm2-1h1v9H7zm2-1h1v10H9zm2-1h1v11h-1zm2 0h1v11h-1zm2-1c-.3 0-.7.1-1 .2v11.8h6c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2h-.5c0-2.2-1.8-4-4-4z"/>
          </svg>
        );
      default:
        return <span style={{ fontSize: size * 0.6 }}>🌐</span>;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        rounded ? "rounded-lg" : "",
        bg,
        className
      )}
      style={{ width: size, height: size }}
      aria-label={platform}
      role="img"
    >
      {renderMark()}
    </span>
  );
}

/**
 * Get the emoji for a platform (backward compat).
 */
export function getPlatformEmoji(platform: string): string {
  return "🌐";
}

/**
 * Get the official logo URL for a platform (backward compat, returns null).
 */
export function getPlatformLogoUrl(_platform: string): string | null {
  return null;
}
