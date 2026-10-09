import { ImageResponse } from "next/og";

export const alt = "Yetenbi – Äthiopisches Restaurant & Café in Würzburg";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share image in the site's look: dark ground, gold wordmark, a row of lit stela windows. */
export default function OpengraphImage() {
  const windows = Array.from({ length: 6 });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(ellipse at 70% 30%, #3b2a16 0%, #1c1712 60%)",
          color: "#f4ecdc",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#c9a24a", fontSize: 26, letterSpacing: 8 }}>
          <div style={{ width: 64, height: 2, background: "#c9a24a" }} />
          RESTAURANT & CAFÉ · WÜRZBURG
        </div>
        <div style={{ fontSize: 168, fontWeight: 700, letterSpacing: 14, color: "#e7cd8a", marginTop: 18 }}>YETENBI</div>
        <div style={{ fontSize: 40, fontStyle: "italic", color: "#e0d6c3", marginTop: 8 }}>Authentisch äthiopisch · Injera, Wot & Jebena Buna</div>
        <div style={{ display: "flex", gap: 22, marginTop: 56 }}>
          {windows.map((_, i) => (
            <div key={i} style={{ width: 44, height: 56, border: "2px solid #c9a24a", background: "radial-gradient(circle at 50% 60%, rgba(255,210,140,0.85), rgba(233,150,58,0.25) 70%)" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
