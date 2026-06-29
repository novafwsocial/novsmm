import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
