import type { TasteProfile } from "./types";

/**
 * Deterministic 6-digit fingerprint for a profile. Not cryptographic — just a readable
 * identifier for the artifact. Widened from the earlier 4-digit version because the
 * birthday bound on 10000 was too tight (~50% collision at ~118 profiles). At 1_000_000
 * the same bound sits around ~1180 profiles, acceptable for a single-user side project
 * while still reading like a magazine issue number.
 */
export function profileSerial(profile: TasteProfile): string {
  const source = profile.headline + profile.summary;
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % 1_000_000;
  return String(n).padStart(6, "0");
}
