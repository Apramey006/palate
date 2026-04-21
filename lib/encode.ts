import type { TasteProfile } from "./types";

// Encode a taste profile into a URL-safe string so profiles are shareable without a database.
// Uses base64url over UTF-8 JSON. Keeps source text short to stay under URL length limits.
export function encodeProfile(profile: TasteProfile): string {
  const json = JSON.stringify(profile);
  const bytes = new TextEncoder().encode(json);
  const b64 = typeof btoa === "function"
    ? btoa(String.fromCharCode(...bytes))
    : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeProfile(encoded: string): TasteProfile | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = typeof atob === "function"
      ? Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
      : Buffer.from(padded, "base64");
    const json = new TextDecoder().decode(bin);
    return JSON.parse(json) as TasteProfile;
  } catch {
    return null;
  }
}
