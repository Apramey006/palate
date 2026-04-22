"use client";

import { useState } from "react";
import type { RecSet, TasteProfile } from "@/lib/types";
import { getRatings } from "@/lib/ratings";

type State = "idle" | "loading" | "error";

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
  const [state, setState] = useState<State>("idle");

  async function regenerate() {
    setState("loading");
    const ratings = getRatings(profileId);
    // Titles to actively avoid re-recommending: current rec set + anything the user
    // marked as "tried." The prompt's ratings block also covers this, but hard-listing
    // in avoid is the belt-and-suspenders version.
    const triedTitles = ratings.filter((r) => r.rating === "tried").map((r) => r.title);
    const avoid = [
      current.hero.title,
      ...current.browse.map((r) => r.title),
      ...triedTitles,
    ];
    try {
      const res = await fetch("/api/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, avoid, ratings }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { recs: RecSet };
      onNew(data.recs);
      setState("idle");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const label =
    state === "loading" ? "Finding more…" : state === "error" ? "Couldn't refresh" : "Another pass";

  return (
    <button
      type="button"
      onClick={regenerate}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 border hairline px-4 py-2 rounded-full text-sm hover:bg-surface transition-colors disabled:bg-surface disabled:text-muted focus-ring"
      aria-live="polite"
    >
      {label}
      <span aria-hidden>{state === "error" ? "✕" : "↻"}</span>
    </button>
  );
}
