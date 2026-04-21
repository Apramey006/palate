"use client";

import { useEffect, useState } from "react";
import type { RecSet, TasteProfile } from "@/lib/types";
import { RecCard } from "./RecCard";
import { RegenerateButton } from "./RegenerateButton";
import { getRatings } from "@/lib/ratings";

const cacheKey = (profileId: string) => `palate:recs:${profileId}`;

export function RecsView({ profile, profileId }: { profile: TasteProfile; profileId: string }) {
  const [recs, setRecs] = useState<RecSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = sessionStorage.getItem(cacheKey(profileId));
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as RecSet;
          if (!cancelled) {
            setRecs(parsed);
            setLoading(false);
          }
          return;
        } catch {
          // fall through
        }
      }
      try {
        const ratings = getRatings(profileId);
        const r = await fetch("/api/recs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, ratings }),
        });
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to fetch recs");
        }
        const data = (await r.json()) as { recs: RecSet; status?: "ok" | "demo" };
        if (cancelled) return;
        sessionStorage.setItem(cacheKey(profileId), JSON.stringify(data.recs));
        setRecs(data.recs);
        if (data.status === "demo") setDemo(true);
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
  }, [profile, profileId]);

  if (loading) return <RecsSkeleton />;

  if (error || !recs) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-accent">
          Couldn&apos;t load recommendations. {error && <span className="text-muted">({error})</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {demo && (
        <p className="text-xs text-muted text-center">
          Demo picks — set an API key to get recs tailored to your actual profile.
        </p>
      )}
      <div>
        <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The hero pick</p>
          <RegenerateButton
            profile={profile}
            profileId={profileId}
            current={recs}
            onNew={(r) => {
              sessionStorage.setItem(cacheKey(profileId), JSON.stringify(r));
              setRecs(r);
            }}
          />
        </div>
        <RecCard rec={recs.hero} hero profileId={profileId} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">Ten more</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recs.browse.map((r) => (
            <RecCard key={r.id} rec={r} profileId={profileId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecsSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-live="polite">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">The hero pick</p>
        <div className="border hairline rounded-lg p-7 bg-surface/40 min-h-[220px]">
          <div className="h-3 w-24 bg-hairline rounded mb-4 shimmer" />
          <div className="h-10 w-3/4 bg-hairline rounded mb-3 shimmer" />
          <div className="h-4 w-full bg-hairline rounded mb-2 shimmer" />
          <div className="h-4 w-5/6 bg-hairline rounded shimmer" />
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">Ten more</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border hairline rounded-lg p-5 bg-surface/40 min-h-[180px]">
              <div className="h-3 w-16 bg-hairline rounded mb-3 shimmer" />
              <div className="h-6 w-2/3 bg-hairline rounded mb-3 shimmer" />
              <div className="h-4 w-full bg-hairline rounded mb-2 shimmer" />
              <div className="h-4 w-4/5 bg-hairline rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
