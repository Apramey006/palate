"use client";

import { useEffect, useState } from "react";
import type { RecSet, TasteProfile } from "@/lib/types";
import { RecCard } from "./RecCard";
import { RegenerateButton } from "./RegenerateButton";

export function RecsView({ profile }: { profile: TasteProfile }) {
  const [recs, setRecs] = useState<RecSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = sessionStorage.getItem(`palate:recs:${profile.headline}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as RecSet;
          if (!cancelled) {
            setRecs(parsed);
            setLoading(false);
          }
          return;
        } catch {
          // fall through to fetch
        }
      }
      try {
        const r = await fetch("/api/recs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        if (!r.ok) throw new Error("Failed to fetch recs");
        const data = (await r.json()) as { recs: RecSet };
        if (cancelled) return;
        setRecs(data.recs);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="py-16 text-center text-muted">
        <p className="text-sm">Finding things you&apos;ll love…</p>
      </div>
    );
  }

  if (error || !recs) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-accent">Couldn&apos;t load recommendations. {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The hero pick</p>
          <RegenerateButton
            profile={profile}
            current={recs}
            onNew={(r) => {
              setRecs(r);
              sessionStorage.setItem(`palate:recs:${profile.headline}`, JSON.stringify(r));
            }}
          />
        </div>
        <RecCard rec={recs.hero} hero />
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">Ten more</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {recs.browse.map((r) => (
            <RecCard key={r.id} rec={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
