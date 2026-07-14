import { ImageResponse } from "next/og";

/**
 * NOVSMM Open Graph image — served at /opengraph-image
 * (Next.js auto-discovers this file and adds og:image meta tags to layout).
 *
 * 1200x630 is the canonical OG image size — works on Twitter, Facebook,
 * LinkedIn, Slack, Discord, iMessage, WhatsApp.
 *
 * Design: pure white background, near-black ink, electric blue accent
 * (matches the landing page design system). No external font fetch (uses
 * the system default sans) so the image renders fast even on cold cache.
 *
 * The runtime is the edge-compatible `next/og` ImageResponse. The route
 * runs at build time during static export and at runtime on first request,
 * then is cached at the CDN edge.
 */
export const runtime = "edge";
export const alt = "NOVSMM — Infrastructure for Social Media Marketing at Scale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#0a0a0b",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Grid background (subtle) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
        {/* Soft blue glow — top right */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(0, 82, 255, 0.08)",
            filter: "blur(120px)",
          }}
        />

        {/* Top row — logo + eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 1,
          }}
        >
          {/* Logo — new metallic design */}
          <img
            src="https://novsmm.shop/logo-new.png"
            width={56}
            height={56}
            style={{ borderRadius: 0 }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>
              NOVSMM
            </div>
            <div style={{ fontSize: 16, color: "#6b7280" }}>
              Infrastructure for social media marketing
            </div>
          </div>
        </div>

        {/* Headline — centered vertically */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            zIndex: 1,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
              color: "#0a0a0b",
            }}
          >
            The infrastructure for{" "}
            <span style={{ color: "#0052ff" }}>
              social media marketing
            </span>{" "}
            at scale.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#4b5563",
              lineHeight: 1.4,
              maxWidth: 880,
            }}
          >
            Real-time order automation, an open reseller marketplace, and
            multi-gateway payments — engineered for teams that ship at the
            speed of attention.
          </div>
        </div>

        {/* Bottom row — trust chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            zIndex: 1,
          }}
        >
          {["99.99% uptime SLA", "SOC 2 controls", "242+ services", "4 gateways"].map(
            (chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 20,
                  color: "#4b5563",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 9999,
                    background: "#10b981",
                  }}
                />
                {chip}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
