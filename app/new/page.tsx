"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, GenerateResponse } from "@/lib/types";
import { encodeProfile } from "@/lib/encode";
import { saveProfileToIndex } from "@/lib/ratings";

interface CategoryMeta {
  key: Category;
  label: string;
  singular: string; // "a film"
  titleHint: string;
  whyHint: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "film",    label: "Films & shows", singular: "a film",   titleHint: "Good Time",                    whyHint: "the anxiety of it, never lets you breathe" },
  { key: "show",    label: "TV",            singular: "a show",   titleHint: "The Bear",                     whyHint: "kitchen chaos as grief language" },
  { key: "book",    label: "Books",         singular: "a book",   titleHint: "A Little Life",                whyHint: "earns every tear it draws" },
  { key: "music",   label: "Music",         singular: "an album", titleHint: "For Emma, Forever Ago",        whyHint: "sounds like a cold cabin" },
  { key: "food",    label: "Food",          singular: "a dish",   titleHint: "Hainanese chicken rice",       whyHint: "refuses to show off" },
  { key: "place",   label: "Places",        singular: "a place",  titleHint: "Golden Gai, Tokyo",            whyHint: "six alleys that don't care if you're there" },
  { key: "podcast", label: "Podcasts",      singular: "a podcast",titleHint: "Heavyweight",                  whyHint: "nostalgia with a scalpel, not a ladle" },
  { key: "game",    label: "Games",         singular: "a game",   titleHint: "Outer Wilds",                  whyHint: "the physics are the story" },
];

const MIN_SLOTS_TO_SUBMIT = 3;
const TOTAL_SLOTS_PER_CATEGORY = 4;

interface Slot {
  title: string;
  why: string;
}

type Answers = Partial<Record<Category, Slot[]>>;

const LOADING_PHRASES = [
  "Looking for texture, not labels…",
  "Noticing what you walk away from…",
  "Reading between your lines…",
  "Sketching a portrait…",
  "Finding the contradictions…",
];

function emptySlots(): Slot[] {
  return Array.from({ length: TOTAL_SLOTS_PER_CATEGORY }, () => ({ title: "", why: "" }));
}

function composeSourceText(picked: Category[], answers: Answers): string {
  const parts: string[] = [];
  for (const cat of picked) {
    const meta = CATEGORIES.find((c) => c.key === cat)!;
    const slots = (answers[cat] ?? []).filter((s) => s.title.trim().length > 0);
    if (slots.length === 0) continue;
    const lines = slots.map((s) =>
      s.why.trim() ? `- ${s.title.trim()}: ${s.why.trim()}` : `- ${s.title.trim()}`,
    );
    parts.push(`${meta.label.toUpperCase()}:\n${lines.join("\n")}`);
  }
  return parts.join("\n\n");
}

export default function NewTastePage() {
  const router = useRouter();
  const [picked, setPicked] = useState<Category[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) return;
    intervalRef.current = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 2400);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [loading]);

  function togglePick(cat: Category) {
    setPicked((prev) => {
      if (prev.includes(cat)) {
        setAnswers((a) => {
          const next = { ...a };
          delete next[cat];
          return next;
        });
        return prev.filter((c) => c !== cat);
      }
      setAnswers((a) => ({ ...a, [cat]: a[cat] ?? emptySlots() }));
      return [...prev, cat];
    });
  }

  function updateSlot(cat: Category, idx: number, field: keyof Slot, value: string) {
    setAnswers((prev) => {
      const current = prev[cat] ?? emptySlots();
      const next = [...current];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, [cat]: next };
    });
  }

  const filledPerCategory = useMemo(() => {
    const result: Partial<Record<Category, number>> = {};
    for (const cat of picked) {
      result[cat] = (answers[cat] ?? []).filter((s) => s.title.trim().length > 0).length;
    }
    return result;
  }, [picked, answers]);

  const validation: { ok: boolean; reason: string | null } = (() => {
    if (picked.length === 0) return { ok: false, reason: "Pick at least one category above." };
    for (const cat of picked) {
      const filled = filledPerCategory[cat] ?? 0;
      if (filled < MIN_SLOTS_TO_SUBMIT) {
        const meta = CATEGORIES.find((c) => c.key === cat)!;
        return {
          ok: false,
          reason: `Add at least ${MIN_SLOTS_TO_SUBMIT} entries to ${meta.label}. (${filled}/${MIN_SLOTS_TO_SUBMIT})`,
        };
      }
    }
    return { ok: true, reason: null };
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }
    const text = composeSourceText(picked, answers);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Something went wrong.");
      }
      const data = (await res.json()) as GenerateResponse;
      const encoded = encodeProfile(data.profile);
      sessionStorage.setItem(`palate:recs:${encoded}`, JSON.stringify(data.recs));
      saveProfileToIndex(encoded, data.profile.headline);
      router.push(`/taste/${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 w-full text-center rise">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" />
          <span>Reading pass</span>
        </div>
        <h1 className="font-serif-display text-3xl md:text-4xl leading-tight italic max-w-xl mx-auto">
          {LOADING_PHRASES[phraseIdx]}
        </h1>
        <div className="mx-auto mt-10 w-32 h-px bg-hairline relative overflow-hidden">
          <div className="absolute inset-0 bg-accent shimmer" />
        </div>
        <p className="mt-10 text-xs text-muted">This takes 10–20 seconds.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 w-full">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-4">Step 1 of 2</p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight tracking-tight mb-4">
        Which tastes should Palate read?
      </h1>
      <p className="text-muted leading-relaxed mb-8">
        Pick the categories you actually care about. For each one, you&apos;ll share{" "}
        {MIN_SLOTS_TO_SUBMIT}–{TOTAL_SLOTS_PER_CATEGORY} specific things you love, and why.
      </p>

      <div className="flex flex-wrap gap-2 mb-12">
        {CATEGORIES.map((c) => {
          const active = picked.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => togglePick(c.key)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus-ring ${
                active
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted hover:text-foreground hairline"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {picked.length > 0 && (
        <>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-4">Step 2 of 2</p>
          <h2 className="font-serif-display text-3xl md:text-4xl leading-tight mb-8">
            Name a few and say why.
          </h2>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        {picked.map((cat) => {
          const meta = CATEGORIES.find((c) => c.key === cat)!;
          const slots = answers[cat] ?? emptySlots();
          const filled = filledPerCategory[cat] ?? 0;
          return (
            <section key={cat}>
              <div className="flex items-baseline justify-between mb-4 gap-3">
                <h3 className="font-serif text-2xl tracking-tight">{meta.label}</h3>
                <span
                  className={`text-[10px] font-mono uppercase tracking-[0.15em] ${
                    filled >= MIN_SLOTS_TO_SUBMIT ? "text-foreground/70" : "text-muted"
                  }`}
                >
                  {filled} / {MIN_SLOTS_TO_SUBMIT}+ needed
                </span>
              </div>
              <div className="space-y-3">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-2 items-start"
                  >
                    <input
                      type="text"
                      value={slot.title}
                      onChange={(e) => updateSlot(cat, i, "title", e.target.value)}
                      placeholder={i === 0 ? meta.titleHint : meta.singular}
                      className="w-full px-3 py-2 bg-surface border hairline rounded-md font-serif text-base focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted/60"
                      aria-label={`${meta.label} — item ${i + 1} title`}
                    />
                    <input
                      type="text"
                      value={slot.why}
                      onChange={(e) => updateSlot(cat, i, "why", e.target.value)}
                      placeholder={i === 0 ? meta.whyHint : "why (optional but encouraged)"}
                      className="w-full px-3 py-2 bg-surface border hairline rounded-md font-serif text-base focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted/60"
                      aria-label={`${meta.label} — item ${i + 1} reason`}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {picked.length > 0 && (
          <div className="sticky bottom-4 z-10 -mx-2">
            <div className="bg-background/80 backdrop-blur-sm border hairline rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-muted font-mono tabular-nums">
                {picked.length} categor{picked.length === 1 ? "y" : "ies"} ·{" "}
                {Object.values(filledPerCategory).reduce((a, b) => a + (b ?? 0), 0)} entries
              </div>
              <button
                type="submit"
                disabled={!validation.ok || loading}
                className="inline-flex items-center justify-center gap-2 bg-accent text-accent-ink px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
              >
                Build my taste profile
                <span aria-hidden>→</span>
              </button>
            </div>
            {(error || (!validation.ok && picked.length > 0)) && (
              <p className="mt-2 text-sm text-accent text-right" role="alert">
                {error ?? validation.reason}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
