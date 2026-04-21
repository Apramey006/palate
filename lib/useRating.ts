"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { RecRating } from "./types";
import { getRatings, setRating as persistRating } from "./ratings";

/**
 * Subscribe to the current rating for a (profileId, recId) pair backed by localStorage.
 * `useSyncExternalStore` is the React-19-blessed way to read from an external store
 * without triggering the "don't setState in an effect" lint rule — and it avoids the
 * hydration flash you get from the "render null, then flip" pattern.
 */
export function useRating(
  profileId: string,
  rec: { id: string; title: string },
): [RecRating | null, (next: RecRating) => void] {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", cb);
    window.addEventListener("palate:ratings-updated", cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener("palate:ratings-updated", cb);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const list = getRatings(profileId);
    return list.find((r) => r.recId === rec.id)?.rating ?? null;
  }, [profileId, rec.id]);

  const getServerSnapshot = useCallback(() => null, []);

  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setRating = useCallback(
    (next: RecRating) => {
      const applied = current === next ? null : next;
      persistRating(profileId, rec, applied);
      window.dispatchEvent(new Event("palate:ratings-updated"));
    },
    [profileId, rec, current],
  );

  return [current, setRating];
}
