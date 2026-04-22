"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { decodeProfile } from "@/lib/encode";

const INDEX_KEY = "palate:profiles";
const EMPTY: ProfileIndexEntry[] = [];

interface ProfileIndexEntry {
  id: string;
  headline: string;
  savedAt: string;
}

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

// Accept either a full /taste/<id> URL or a bare id. Returns null if nothing usable.
function extractId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/taste\/([^/]+)/);
    if (match) return match[1];
  } catch {
    // not a URL — maybe a bare id
  }
  // treat as bare id if it looks like base64url (no spaces, no slash)
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

export function CompareLauncher({ currentId }: { currentId: string }) {
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
  const otherProfiles = entries.filter((e) => e.id !== currentId);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function go(otherId: string) {
    setOpen(false);
    router.push(`/taste/${currentId}/vs/${otherId}`);
  }

  function handlePaste(e: React.FormEvent) {
    e.preventDefault();
    const id = extractId(pasted);
    if (!id) {
      setError("That doesn't look like a Palate profile link.");
      return;
    }
    if (id === currentId) {
      setError("That's this profile — pick a different one.");
      return;
    }
    // Validate the ID actually decodes to a profile before navigating. Cheaper
    // than sending the user to a 404 they have to back-button out of.
    if (!decodeProfile(id)) {
      setError("That link didn't decode as a Palate profile.");
      return;
    }
    setError(null);
    go(id);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 border hairline px-4 py-2 rounded-full text-sm hover:bg-surface transition-colors focus-ring"
      >
        Compare with…
        <span aria-hidden>⇄</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Compare with another profile"
          className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] z-20 border hairline-strong rounded-xl bg-background shadow-lg p-4 space-y-4 rise"
        >
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-2">
              Paste a Palate link
            </p>
            <form onSubmit={handlePaste} className="flex gap-2">
              <input
                type="text"
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value);
                  setError(null);
                }}
                placeholder="palate.app/taste/…"
                className="flex-1 px-3 py-2 bg-surface border hairline rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                aria-label="Palate profile URL"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-accent text-accent-ink rounded-md text-sm font-medium hover:opacity-90 transition-opacity focus-ring"
              >
                Go
              </button>
            </form>
            {error && (
              <p className="mt-2 text-xs text-accent" role="alert">
                {error}
              </p>
            )}
          </div>

          {otherProfiles.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-2">
                Or pick a recent one
              </p>
              <ul className="space-y-1 max-h-56 overflow-y-auto -mx-1">
                {otherProfiles.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => go(e.id)}
                      className="w-full text-left px-2 py-2 rounded-md hover:bg-surface transition-colors focus-ring"
                    >
                      <span className="font-serif italic text-sm line-clamp-1">
                        &ldquo;{e.headline}&rdquo;
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {otherProfiles.length === 0 && (
            <p className="text-xs text-muted">
              You don&apos;t have other profiles yet. Share this link with a friend, then paste
              theirs back.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
