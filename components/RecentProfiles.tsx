"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { getProfileIndex } from "@/lib/ratings";

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

  const entries = useSyncExternalStore(
    subscribe,
    () => getProfileIndex(),
    () => [],
  );

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
