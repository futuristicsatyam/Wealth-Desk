import { ImageResponse } from "next/og";

// Branded social share card (Open Graph + Twitter). Rendered by next/og at
// build/request time — self-contained, no external assets.
export const alt = "Wealth Research Desk — Institutional-grade Indian market research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#08090C",
          color: "#F5F6F8",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#0F1015",
              border: "2px solid #8B5CF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8B5CF6",
              fontSize: "34px",
              fontWeight: 700
            }}
          >
            W
          </div>
          <div style={{ fontSize: "26px", letterSpacing: "6px", color: "#8B5CF6", textTransform: "uppercase" }}>
            Wealth Research Desk
          </div>
        </div>
        <div style={{ marginTop: "44px", fontSize: "68px", fontWeight: 700, lineHeight: 1.1, maxWidth: "900px" }}>
          Institutional-grade Indian market research
        </div>
        <div style={{ marginTop: "28px", fontSize: "30px", color: "#9AA0AA", maxWidth: "860px" }}>
          Risk-managed trade intelligence, daily outlook, and transparent performance.
        </div>
      </div>
    ),
    { ...size }
  );
}
