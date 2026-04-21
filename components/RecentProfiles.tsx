"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";

const INDEX_KEY = "palate:profiles";
const EMPTY: ProfileIndexEntry[] = [];

interface ProfileIndexEntry {
  id: string;
  headline: string;
  savedAt: string;
}

// useSyncExternalStore compares snapshots with Object.is. `JSON.parse` returns a fresh
// array reference every call, so we'd re-render forever. Cache the parsed value keyed
// by the raw localStorage string — same raw ⇒ same reference back.
let cachedRaw: string | null = null;
let cachedEntries: ProfileIndexEntry[] = EMPTY;

function readProfileIndex(): ProfileIndexEntry[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(INDEX_KEY);
  if (raw === cachedRaw) return cachedEntries;
  cachedRaw = raw;
  if (!raw) {
    cachedEntries = EMPTY;
    return cachedEntries;
  }
  try {
    cachedEntries = JSON.parse(raw) as ProfileIndexEntry[];
  } catch {
    cachedEntries = EMPTY;
  }
  return cachedEntries;
}

export function RecentProfiles() {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", cb);
    window.addEventListener("palate:profiles-updated", cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener("palate:profiles-updated", cb);
    };
  }, []);

  const entries = useSyncExternalStore(subscribe, readProfileIndex, () => EMPTY);

  if (entries.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-6 pb-16 rise">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-4">
        Your recent profiles
      </p>
      <ul className="divide-y hairline border-t hairline">
        {entries.slice(0, 5).map((e) => (
          <li key={e.id}>
            <Link
              href={`/taste/${e.id}`}
              className="flex items-center justify-between py-4 group focus-ring rounded-sm gap-4"
            >
              <span className="font-serif text-lg italic group-hover:text-accent transition-colors max-w-xl truncate">
                &ldquo;{e.headline}&rdquo;
              </span>
              <span className="text-xs font-mono text-muted whitespace-nowrap">
                {new Date(e.savedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
