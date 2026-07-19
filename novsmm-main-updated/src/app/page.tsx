import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/novsmm/error-boundary";
import { SmoothScroll } from "@/components/novsmm/smooth-scroll";
import { AppView } from "@/components/novsmm/app-view";
import { LandingJsonLd } from "@/components/novsmm/landing-json-ld";
import { LanguageProvider } from "@/components/novsmm/language-provider";

// Keep cross-view utilities lazy so they do not block the first mobile paint.
const WhatsAppWidget = dynamic(() => import("@/components/novsmm/whatsapp-widget").then((m) => ({ default: m.WhatsAppWidget })));
const StickyCTA = dynamic(() => import("@/components/novsmm/sticky-cta").then((m) => ({ default: m.StickyCTA })));
const SocialProof = dynamic(() => import("@/components/novsmm/social-proof").then((m) => ({ default: m.SocialProof })));
const LandingCommandPalette = dynamic(() => import("@/components/novsmm/landing-command-palette").then((m) => ({ default: m.LandingCommandPalette })));

export default function Home() {
  return (
    <ErrorBoundary>
      <SmoothScroll>
        <LanguageProvider>
          <div className="relative flex min-h-screen flex-col bg-background">
            {/* Static JSON-LD stays server-rendered for crawlers. */}
            <LandingJsonLd />
            <AppView />
            <WhatsAppWidget />
            <StickyCTA />
            <SocialProof />
            <LandingCommandPalette />
          </div>
        </LanguageProvider>
      </SmoothScroll>
    </ErrorBoundary>
  );
}
