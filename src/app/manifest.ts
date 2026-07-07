import type { MetadataRoute } from "next";

/**
 * PWA Manifest — served at /manifest.webmanifest by Next.js.
 * Allows the app to be installed as a standalone app on mobile/desktop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOVSMM — SMM Panel Platform",
    short_name: "NOVSMM",
    description: "Infrastructure for social media marketing at scale",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "social"],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Home",
        url: "/?view=dashboard",
      },
      {
        name: "Marketplace",
        short_name: "Services",
        url: "/?view=dashboard&tab=marketplace",
      },
    ],
  };
}
