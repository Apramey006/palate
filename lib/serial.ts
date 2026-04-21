import type { TasteProfile } from "./types";

// Deterministic 4-digit serial from a profile, so the same profile always carries the
// same number. Nothing cryptographic — just a readable fingerprint for the artifact.
export function profileSerial(profile: TasteProfile): string {
  const source = profile.headline + profile.summary;
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % 10000;
  return String(n).padStart(4, "0");
}
