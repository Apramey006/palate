"use client";

import type { RecRating, StoredRating } from "./types";

const key = (profileId: string) => `palate:ratings:${profileId}`;

export function getRatings(profileId: string): StoredRating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredRating[];
  } catch {
    return [];
  }
}

export function setRating(
  profileId: string,
  rec: { id: string; title: string },
  rating: RecRating | null,
): StoredRating[] {
  if (typeof window === "undefined") return [];
  const current = getRatings(profileId).filter((r) => r.recId !== rec.id);
  const next = rating
    ? [
        ...current,
        { recId: rec.id, title: rec.title, rating, ratedAt: new Date().toISOString() },
      ]
    : current;
  localStorage.setItem(key(profileId), JSON.stringify(next));
  return next;
}

// A thin per-profile savelist — lets the user have a "saved profiles" index
// without any server state. Keyed by a short label + encoded id.
const INDEX_KEY = "palate:profiles";
interface ProfileIndexEntry {
  id: string;
  headline: string;
  savedAt: string;
}

export function saveProfileToIndex(id: string, headline: string): ProfileIndexEntry[] {
  if (typeof window === "undefined") return [];
  const existing = getProfileIndex().filter((e) => e.id !== id);
  const next: ProfileIndexEntry[] = [
    { id, headline, savedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, 12);
  localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("palate:profiles-updated"));
  return next;
}

export function getProfileIndex(): ProfileIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProfileIndexEntry[];
  } catch {
    return [];
  }
}
