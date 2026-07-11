import { ImageResponse } from "next/og";

/**
 * NOVSMM Twitter Card image — served at /twitter-image
 * (Next.js auto-discovers this file and adds twitter:image meta tags).
 *
 * Same dimensions as OG (1200x630) — Twitter's "summary_large_image" card
 * uses the same aspect ratio so the design system stays consistent.
 *
 * Subtly different visual treatment: the blue glow is moved to the bottom
 * (Twitter crops top + bottom on some clients — so the headline sits
 * higher in the safe area).
 */
export const runtime = "edge";
export const alt = "NOVSMM — Infrastructure for Social Media Marketing at Scale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
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
        {/* Grid background */}
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
        {/* Glow — bottom (Twitter top-crop safe) */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 500,
            borderRadius: 9999,
            background: "rgba(0, 82, 255, 0.10)",
            filter: "blur(140px)",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#0052ff",
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            N
          </div>
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
              @novsmm · social media marketing infrastructure
            </div>
          </div>
        </div>

        {/* Headline */}
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
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            zIndex: 1,
          }}
        >
          {["99.99% uptime", "SOC 2", "8 gateways"].map((chip) => (
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
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
