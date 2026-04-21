import { ImageResponse } from "next/og";
import { decodeProfile } from "@/lib/encode";
import { profileSerial } from "@/lib/serial";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Palate taste profile";

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = decodeProfile(id);

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#faf7f2",
            color: "#1a1815",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Georgia, serif",
            fontSize: 48,
          }}
        >
          Palate
        </div>
      ),
      size,
    );
  }

  const serial = profileSerial(profile);
  const headline = profile.headline;
  const topDims = profile.dimensions.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "60px 72px",
          background: "#f6f0e4",
          color: "#1a1815",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            fontFamily: "ui-monospace, Menlo, monospace",
            color: "#8b8074",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#c9512f" }} />
            <span>Palate · A Taste Profile</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span>№ {serial}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1.05,
              fontStyle: "italic",
              letterSpacing: -1,
              maxWidth: 980,
            }}
          >
            &ldquo;{headline}&rdquo;
          </div>
          <div style={{ width: 80, height: 3, background: "#c9512f", marginTop: 28, marginBottom: 28 }} />
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {topDims.map((d) => (
              <div
                key={d.label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  fontSize: 22,
                  color: "#1a1815",
                }}
              >
                <span>{d.label}</span>
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace", color: "#8b8074", fontSize: 16 }}>
                  {String(Math.round(d.strength * 100)).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            fontFamily: "ui-monospace, Menlo, monospace",
            color: "#8b8074",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>palate</span>
          <span>Reads paragraphs, not checkboxes</span>
        </div>
      </div>
    ),
    size,
  );
}
