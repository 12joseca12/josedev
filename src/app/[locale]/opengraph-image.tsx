import { ImageResponse } from "next/og";

// P4 SEO fix (H6): no OG image existed anywhere in the app, yet the layout
// declares `twitter: { card: "summary_large_image" }` — every social share
// rendered text-only or a scraped random image. This is the sitewide default;
// any route that wants its own image (e.g. a future per-article blog OG image)
// can add its own `opengraph-image.tsx` deeper in the tree and it will take
// precedence over this one for that subtree.
//
// Text is intentionally brand-neutral/English-only across both locales (no
// literals.json entry needed) — this is generated pixels for a share-card
// preview, not page copy.

export const alt = "Jose Dev — josecoded.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dash theme dark tokens — src/lib/stylesVariables.ts (dashThemeColors), kept
// as literal hex here since ImageResponse renders outside the Tailwind/CSS
// pipeline and can't read CSS custom properties.
const COLORS = {
  bg: "#141414",
  text: "#F7F5F0",
  muted: "#9C9890",
  border: "#322F2A",
  accent: "#C87D4A",
  accentText: "#D69466",
};

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: COLORS.bg,
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              backgroundColor: COLORS.accent,
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: COLORS.accentText,
              display: "flex",
            }}
          >
            josecoded.com
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 108,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.05,
              display: "flex",
            }}
          >
            Jose Dev
          </div>
          <div
            style={{
              fontSize: 34,
              color: COLORS.muted,
              display: "flex",
            }}
          >
            Full-stack web &amp; mobile engineering
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: 32,
          }}
        >
          <div style={{ fontSize: 22, color: COLORS.muted, display: "flex" }}>
            Clean code · Scalable infrastructure · High performance
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
