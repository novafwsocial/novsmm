import type { SVGProps, ReactElement } from "react";

/**
 * Custom monochrome platform marks — built from scratch.
 * All use currentColor so they inherit the parent's text color.
 * Each follows the recognizable silhouette of its platform.
 */

type IconProps = SVGProps<SVGSVGElement>;

export function InstagramMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14 3h2.6c.3 1.9 1.4 3.6 3.4 4.2v2.6c-1.3 0-2.5-.4-3.5-1v5.7c0 3.2-2.6 5.8-5.8 5.8S4.9 17.7 4.9 14.5s2.6-5.8 5.8-5.8c.5 0 .9.1 1.3.2v2.8c-.4-.2-.8-.3-1.3-.3-1.7 0-3 1.4-3 3.1s1.4 3.1 3 3.1 3-1.4 3-3.1V3z" />
    </svg>
  );
}

export function FacebookMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14 9.5V8c0-.7.3-1 1-1h2V4h-2.5C12 4 11 5.6 11 7.6v1.9H9v3h2V21h3v-8.5h2.3l.5-3H14z" />
    </svg>
  );
}

export function YouTubeMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.6 8.2c-.2-1-.9-1.7-1.9-2C18 6 12 6 12 6s-6 0-7.7.2c-1 .3-1.7 1-1.9 2C2.2 9.9 2.2 12 2.2 12s0 2.1.2 3.8c.2 1 .9 1.7 1.9 2C6 18 12 18 12 18s6 0 7.7-.2c1-.3 1.7-1 1.9-2 .2-1.7.2-3.8.2-3.8s0-2.1-.2-3.8zM10 15V9l5.2 3-5.2 3z" />
    </svg>
  );
}

export function TelegramMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.9 5.3l-2.9 13.6c-.2.9-.8 1.2-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.9.4l.3-4.2 7.7-7c.3-.3-.1-.5-.5-.2L8.4 13.1l-4-1.2c-.9-.3-.9-.9.2-1.3l15.6-6c.7-.3 1.4.2 1.1 1.5z" />
    </svg>
  );
}

export function DiscordMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.3 5.3A16 16 0 0 0 15.4 4l-.2.4c1.5.4 2.7 1 3.9 1.8a13 13 0 0 0-11 0c1.2-.8 2.5-1.4 3.9-1.8L11.7 4c-1.4.3-2.7.8-3.9 1.3C5 9.3 4.2 13.2 4.6 17c1.6 1.2 3.2 1.9 4.7 2.4l.4-.6c-.8-.3-1.5-.7-2.2-1.2l.5-.4c3 1.4 6.3 1.4 9.3 0l.5.4c-.7.5-1.4.9-2.2 1.2l.4.6c1.5-.5 3.1-1.2 4.7-2.4.5-4.4-.8-8.3-3.2-11.7zM9.7 14.7c-.9 0-1.7-.8-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9zm4.6 0c-.9 0-1.7-.8-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9z" />
    </svg>
  );
}

export function SpotifyMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4c-.2.3-.6.4-.9.2-2.4-1.5-5.5-1.8-9.1-1-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 3.9-.9 7.4-.5 10 1.2.4.2.5.6.3.9zm1.2-2.7c-.2.4-.7.5-1.1.3-2.8-1.7-7-2.2-10.3-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.7-1.1 8.4-.6 11.6 1.4.4.2.5.7.3 1zm.1-2.8C14.6 8.9 9.3 8.7 6.1 9.7c-.5.2-1.1-.1-1.2-.6-.2-.5.1-1.1.6-1.2 3.7-1.1 9.6-.9 13.5 1.4.5.3.6.9.4 1.4-.3.4-.9.5-1.5.2z" />
    </svg>
  );
}

export function ThreadsMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.7 11.3c-.1 0-.2-.1-.3-.1-.2-3.1-1.9-4.9-4.7-4.9-1.7 0-3.1.7-4 2l1.5 1c.7-.9 1.6-1.3 2.5-1.3 1.7 0 2.7 1.1 2.9 2.9-.7-.1-1.5-.2-2.3-.1-2.4.1-3.9 1.5-3.8 3.4 0 .9.5 1.7 1.2 2.2.6.4 1.4.6 2.2.6 1.4-.1 2.4-.6 3.1-1.6.5-.7.8-1.6.9-2.7.7.4 1.2.9 1.5 1.6.5 1.1.6 2.9-.9 4.4-1.4 1.4-3 2-5.5 2-2.7 0-4.7-.9-6-2.6C5 18 4.3 15.8 4.2 13c0-2.8.7-5 2.1-6.6C7.6 4.7 9.6 3.8 12 3.8c2.5 0 4.5.9 5.9 2.6.7.8 1.2 1.9 1.5 3.1.2.9.2 1.7.2 1.7-.4 0-2.1 0-2.9.1zm-3.9 4c-.8 0-1.6-.3-1.6-1.2 0-.8.7-1.3 1.9-1.4.4 0 .8 0 1.2.1-.2 1.7-.9 2.5-1.5 2.5z" />
    </svg>
  );
}

export function XMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.5 3h3l-6.6 7.5L21.8 21h-5.9l-4.2-5.5L6.6 21H3.5l7-8L3 3h6l3.8 5 4.7-5zm-1 16h1.7L8.1 4.7H6.3L16.5 19z" />
    </svg>
  );
}

export function KickMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 3h4v5h2V6h2V4h2V3h4v6h-2v2h-2v2h2v2h2v6h-4v-1h-2v-2h-2v-2H9v5H5V3z" />
    </svg>
  );
}

export function TwitchMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4 3l-1 4v13h4v3h3l3-3h4l4-4V3H4zm15 9l-3 3h-4l-3 3v-3H5V5h14v7zm-3-5h-2v5h2V7zm-5 0H9v5h2V7z" />
    </svg>
  );
}

export type Platform = {
  name: string;
  Icon: (p: IconProps) => ReactElement;
  tint: string;
  services: number;
  blurb: string;
};

export const PLATFORMS: Platform[] = [
  { name: "Instagram", Icon: InstagramMark, tint: "#E1306C", services: 1298, blurb: "Followers, likes, views, reels, stories." },
  { name: "Telegram", Icon: TelegramMark, tint: "#229ED9", services: 1878, blurb: "Members, views, reactions, bots." },
  { name: "Facebook", Icon: FacebookMark, tint: "#1877F2", services: 701, blurb: "Page likes, reach, group members." },
  { name: "YouTube", Icon: YouTubeMark, tint: "#FF0000", services: 662, blurb: "Watch hours, subs, likes, shorts." },
  { name: "Spotify", Icon: SpotifyMark, tint: "#1DB954", services: 473, blurb: "Plays, listeners, followers, saves." },
  { name: "X", Icon: XMark, tint: "#111111", services: 385, blurb: "Followers, impressions, retweets." },
  { name: "TikTok", Icon: TikTokMark, tint: "#111111", services: 348, blurb: "Views, likes, followers, shares, saves." },
  { name: "Twitch", Icon: TwitchMark, tint: "#9146FF", services: 82, blurb: "Viewers, followers, clip views." },
  { name: "Kick", Icon: KickMark, tint: "#53FC18", services: 86, blurb: "Followers, live viewers, chat." },
  { name: "WhatsApp", Icon: TelegramMark, tint: "#25D366", services: 63, blurb: "Marketing, messages, groups." },
  { name: "LinkedIn", Icon: FacebookMark, tint: "#0A66C2", services: 52, blurb: "Connections, followers, likes." },
  { name: "Threads", Icon: ThreadsMark, tint: "#111111", services: 18, blurb: "Followers, likes, reposts." },
  { name: "Snapchat", Icon: InstagramMark, tint: "#FFFC00", services: 13, blurb: "Followers, views, spotlight." },
  { name: "Discord", Icon: DiscordMark, tint: "#5865F2", services: 2, blurb: "Members, online boost, reactions." },
];
