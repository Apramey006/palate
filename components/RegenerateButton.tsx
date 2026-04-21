"use client";

import { useState } from "react";
import type { RecSet, TasteProfile } from "@/lib/types";

export function RegenerateButton({
  profile,
  current,
  onNew,
}: {
  profile: TasteProfile;
  current: RecSet;
  onNew: (r: RecSet) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    setLoading(true);
    const avoid = [current.hero.title, ...current.browse.map((r) => r.title)];
    try {
      const res = await fetch("/api/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, avoid }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { recs: RecSet };
      onNew(data.recs);
    } catch {
      // swallow; keep existing recs
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={regenerate}
      disabled={loading}
      className="inline-flex items-center gap-2 border hairline px-4 py-2 rounded-full text-sm hover:bg-surface transition-colors disabled:opacity-50"
    >
      {loading ? "Finding more…" : "More picks"}
      <span aria-hidden>↻</span>
    </button>
  );
}
