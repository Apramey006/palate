import { ImageResponse } from "next/og";
import { decodeProfile } from "@/lib/encode";
import { profileSerial } from "@/lib/serial";
import { TasteProfileSchema } from "@/lib/types";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Palate taste profile";
// Cache rendered OGs for an hour. Keeps Satori off the hot path on repeated shares and
// blunts the DoS vector of an attacker spraying valid-but-huge encoded payloads.
export const revalidate = 3600;

// Fraunces italic — loaded from Google Fonts via a raw download in the OG route so the
// rendered image matches site typography instead of falling back to Georgia.
async function loadFraunces(): Promise<ArrayBuffer | null> {
  try {
    const url =
      "https://fonts.gstatic.com/s/fraunces/v31/6NUy8FOPD1u5iTl2IIHLaXP8r5Fmvmw.ttf";
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function firstSentence(s: string): string {
  const trimmed = s.trim();
  const match = trimmed.match(/^.+?[.!?](\s|$)/);
  return (match ? match[0] : trimmed).trim();
}

function headlineFontSize(headline: string): number {
  // Auto-shrink long headlines so they never clip. Tuned against Fraunces italic
  // at our 900px inner column.
  const len = headline.length;
  if (len <= 38) return 80;
  if (len <= 60) return 66;
  if (len <= 90) return 54;
  return 44;
}

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeProfile(id);
  const parsed = decoded ? TasteProfileSchema.safeParse(decoded) : null;

  if (!parsed?.success) {
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
            fontSize: 56,
          }}
        >
          Palate
        </div>
      ),
      size,
    );
  }

  const profile = parsed.data;
  const serial = profileSerial(profile);
  const hook = firstSentence(profile.summary);
  const headlineSize = headlineFontSize(profile.headline);
  const fraunces = await loadFraunces();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "72px 84px",
          background: "#f6f0e4",
          color: "#1a1815",
          fontFamily: "FrauncesInline, Georgia, serif",
          backgroundImage:
            "radial-gradient(at 27% 13%, rgba(201, 81, 47, 0.05) 0, transparent 42%), radial-gradient(at 73% 87%, rgba(139, 128, 116, 0.06) 0, transparent 45%)",
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
            <div
              style={{ width: 10, height: 10, borderRadius: 999, background: "#c9512f" }}
            />
            <span>Palate · A Taste Profile</span>
          </div>
          <span>№ {serial}</span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: headlineSize,
              lineHeight: 1.05,
              fontStyle: "italic",
              letterSpacing: -1,
            }}
          >
            &ldquo;{profile.headline}&rdquo;
          </div>
          <div style={{ width: 80, height: 3, background: "#c9512f" }} />
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.4,
              color: "#3a332c",
              fontStyle: "italic",
              maxWidth: 880,
            }}
          >
            {hook}
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
    {
      ...size,
      fonts: fraunces
        ? [
            {
              name: "FrauncesInline",
              data: fraunces,
              style: "italic",
              weight: 400,
            },
          ]
        : undefined,
    },
  );
}
