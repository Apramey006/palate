"use client";

import { useState } from "react";
import type { RecSet, TasteProfile } from "@/lib/types";
import { getRatings } from "@/lib/ratings";

export function RegenerateButton({
  profile,
  profileId,
  current,
  onNew,
}: {
  profile: TasteProfile;
  profileId: string;
  current: RecSet;
  onNew: (r: RecSet) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    setLoading(true);
    const avoid = [current.hero.title, ...current.browse.map((r) => r.title)];
    const ratings = getRatings(profileId);
    try {
      const res = await fetch("/api/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, avoid, ratings }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { recs: RecSet };
      onNew(data.recs);
    } catch {
      // swallow; keep existing recs. Failed state surfaces via the empty regenerate.
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={regenerate}
      disabled={loading}
      className="inline-flex items-center gap-2 border hairline px-4 py-2 rounded-full text-sm hover:bg-surface transition-colors disabled:bg-surface disabled:text-muted focus-ring"
    >
      {loading ? "Finding more…" : "Another pass"}
      <span aria-hidden>↻</span>
    </button>
  );
}
