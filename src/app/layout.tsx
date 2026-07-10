import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "@/lib/app-providers";
import { SwRegister } from "@/components/novsmm/sw-register";
import { WebVitals } from "@/components/novsmm/web-vitals";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"], // only needed weights (not all 9)
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"], // only needed weights
  preload: false, // mono font is rare, don't preload
});

export const viewport: Viewport = {
  // BROAD-FIX-BATCH-1: aligned with the canonical PWA manifest theme_color
  // (#0052ff — NOVSMM electric blue). The previous #0a0a0a conflicted with
  // the manifest's #ffffff and the brand's primary action color.
  themeColor: "#0052ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "NOVSMM — Infrastructure for Social Media Marketing at Scale",
  description:
    "NOVSMM is the automation infrastructure for digital marketing teams and resellers. Real-time order fulfillment, an open marketplace, and enterprise-grade security — engineered for performance.",
  keywords: [
    "NOVSMM",
    "SMM panel",
    "social media automation",
    "reseller infrastructure",
    "marketing platform",
    "SaaS",
  ],
  authors: [{ name: "NOVSMM" }],
  openGraph: {
    title: "NOVSMM — Infrastructure for Social Media Marketing at Scale",
    description:
      "Automation infrastructure for digital marketing teams and resellers. Real-time fulfillment, open marketplace, enterprise-grade security.",
    siteName: "NOVSMM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NOVSMM — Infrastructure for Social Media Marketing at Scale",
    description:
      "Automation infrastructure for digital marketing teams and resellers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AppProviders>
          {children}
          <Toaster />
          <SwRegister />
          <WebVitals />
        </AppProviders>
      </body>
    </html>
  );
}
