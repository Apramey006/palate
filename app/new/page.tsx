"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, GenerateResponse } from "@/lib/types";
import { encodeProfile } from "@/lib/encode";
import { saveProfileToIndex } from "@/lib/ratings";

interface HintPair {
  title: string;
  why: string;
}

interface CategoryMeta {
  key: Category;
  label: string;
  singular: string;
  hints: HintPair[]; // rotate across slots so slot 2/3/4 aren't generic
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "film",
    label: "Films & shows",
    singular: "a film",
    hints: [
      { title: "Good Time", why: "the anxiety of it, never lets you breathe" },
      { title: "Past Lives", why: "the politeness of grief" },
      { title: "Paris, Texas", why: "a walk back into a family you ruined" },
      { title: "Portrait of a Lady on Fire", why: "looking as the whole love story" },
    ],
  },
  {
    key: "show",
    label: "TV",
    singular: "a show",
    hints: [
      { title: "The Bear", why: "kitchen chaos as grief language" },
      { title: "Fleabag", why: "the fourth wall as a lifeline" },
      { title: "Atlanta", why: "dream logic on a working-class budget" },
      { title: "Succession", why: "a family business as a personality disorder" },
    ],
  },
  {
    key: "book",
    label: "Books",
    singular: "a book",
    hints: [
      { title: "A Little Life", why: "earns every tear it draws" },
      { title: "Severance, Ling Ma", why: "office apocalypse that's actually about memory" },
      { title: "Stoner, John Williams", why: "a quiet American life that ambushes you" },
      { title: "Kitchen Confidential", why: "a voice you'd recognize in a crowded bar" },
    ],
  },
  {
    key: "music",
    label: "Music",
    singular: "an album",
    hints: [
      { title: "For Emma, Forever Ago", why: "sounds like a cold cabin" },
      { title: "A Crow Looked at Me, Mount Eerie", why: "widow record that doesn't soften" },
      { title: "Time (The Revelator), Gillian Welch", why: "music that sounds like old wood" },
      { title: "A Seat at the Table, Solange", why: "craft that doesn't announce itself" },
    ],
  },
  {
    key: "food",
    label: "Food",
    singular: "a dish",
    hints: [
      { title: "Hainanese chicken rice", why: "refuses to show off" },
      { title: "Bún chả at a plastic-stool Hanoi spot", why: "the grill smoke ends up in the broth" },
      { title: "A cheese plate on a French train", why: "somehow perfect at 60mph" },
      { title: "Cacio e pepe at a counter", why: "three ingredients, no apologies" },
    ],
  },
  {
    key: "place",
    label: "Places",
    singular: "a place",
    hints: [
      { title: "Golden Gai, Tokyo", why: "six alleys that don't care if you're there" },
      { title: "A Denny's at 3am", why: "liminal fluorescent grief" },
      { title: "Marfa, Texas", why: "desert minimalism built by a cranky sculptor" },
      { title: "Any Greyhound station after midnight", why: "the world without its costume on" },
    ],
  },
  {
    key: "podcast",
    label: "Podcasts",
    singular: "a podcast",
    hints: [
      { title: "Heavyweight", why: "nostalgia with a scalpel, not a ladle" },
      { title: "The Daily", why: "the news as a composed short story" },
      { title: "Hard Fork", why: "two smart friends arguing about your phone" },
      { title: "Radiolab", why: "the sound design does half the thinking" },
    ],
  },
  {
    key: "game",
    label: "Games",
    singular: "a game",
    hints: [
      { title: "Outer Wilds", why: "the physics are the story" },
      { title: "Disco Elysium", why: "a novel that lets you fail at being you" },
      { title: "Breath of the Wild", why: "silence as a level-design choice" },
      { title: "Return of the Obra Dinn", why: "a sketch that thinks it's a ledger" },
    ],
  },
];

const MIN_SLOTS_TO_SUBMIT = 3;
const TOTAL_SLOTS_PER_CATEGORY = 4;
const DRAFT_KEY = "palate:intake-draft";

interface Slot {
  title: string;
  why: string;
}

type Answers = Partial<Record<Category, Slot[]>>;

interface Draft {
  picked: Category[];
  answers: Answers;
}

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

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!Array.isArray(parsed.picked) || typeof parsed.answers !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // quota or private-mode — non-fatal
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

export default function NewTastePage() {
  const router = useRouter();
  const [picked, setPicked] = useState<Category[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Hydrate from draft once on mount. Done in useEffect (not a lazy initializer)
  // so SSR and first client paint match — avoids a hydration mismatch when the
  // client has a draft but the server rendered with empty state. The lint rule
  // correctly discourages setState-in-effect in general, but one-shot client-only
  // hydration from localStorage is the explicit exception.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.picked.length > 0 || Object.keys(draft.answers).length > 0)) {
      setPicked(draft.picked);
      setAnswers(draft.answers);
      setDraftRestored(true);
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist draft on change, post-hydration.
  useEffect(() => {
    if (!hydrated) return;
    if (picked.length === 0 && Object.keys(answers).length === 0) {
      clearDraft();
      return;
    }
    saveDraft({ picked, answers });
  }, [picked, answers, hydrated]);

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

  function handleStartOver() {
    setPicked([]);
    setAnswers({});
    setDraftRestored(false);
    clearDraft();
  }

  const filledPerCategory = useMemo(() => {
    const result: Partial<Record<Category, number>> = {};
    for (const cat of picked) {
      result[cat] = (answers[cat] ?? []).filter((s) => s.title.trim().length > 0).length;
    }
    return result;
  }, [picked, answers]);

  const totalFilled = useMemo(
    () => Object.values(filledPerCategory).reduce((a, b) => a + (b ?? 0), 0),
    [filledPerCategory],
  );
  const totalRequired = picked.length * MIN_SLOTS_TO_SUBMIT;

  const validation: { ok: boolean; reason: string | null } = (() => {
    if (picked.length === 0) return { ok: false, reason: "Pick at least one category above." };
    for (const cat of picked) {
      const filled = filledPerCategory[cat] ?? 0;
      if (filled < MIN_SLOTS_TO_SUBMIT) {
        const meta = CATEGORIES.find((c) => c.key === cat)!;
        const remaining = MIN_SLOTS_TO_SUBMIT - filled;
        return {
          ok: false,
          reason: `${remaining} more in ${meta.label} to unlock your profile.`,
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
      // When the profile comes back thin ("Not enough to go on yet"), there are no
      // recs — don't cache an empty payload, and don't save to the profile index (the
      // user will want to refine and re-submit, not come back to this honest stub).
      if (data.recs) {
        sessionStorage.setItem(`palate:recs:${encoded}`, JSON.stringify(data.recs));
      }
      if (data.status !== "thin") {
        saveProfileToIndex(encoded, data.profile.headline);
      }
      clearDraft();
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
        <p className="mt-10 text-xs text-muted">This usually takes a moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 w-full">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-4">Step 1 of 2</p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight tracking-tight mb-4">
        Which tastes should Palate read?
      </h1>
      <p className="text-muted leading-relaxed mb-3">
        Pick the categories you actually care about. For each one, share{" "}
        {MIN_SLOTS_TO_SUBMIT}–{TOTAL_SLOTS_PER_CATEGORY} specific things you love, and why. Any
        length — a fragment counts.
      </p>
      {draftRestored && (
        <p className="text-xs text-muted mb-6" role="status">
          Picked up where you left off.{" "}
          <button
            type="button"
            onClick={handleStartOver}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Start over
          </button>
        </p>
      )}

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
          <h2 className="font-serif-display text-3xl md:text-4xl leading-tight mb-3">
            Name a few and say why.
          </h2>
          <p className="text-muted text-sm leading-relaxed mb-8">
            The &ldquo;why&rdquo; is where Palate reads texture. Any phrase — a smell, a feeling,
            the specific thing that got you — beats a review.
          </p>
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
                  {filled >= MIN_SLOTS_TO_SUBMIT
                    ? `Unlocked · ${filled} filled`
                    : `${filled} / ${MIN_SLOTS_TO_SUBMIT}+ needed`}
                </span>
              </div>
              <div className="space-y-3">
                {slots.map((slot, i) => {
                  const hint = meta.hints[i % meta.hints.length];
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-2 items-start"
                    >
                      <input
                        type="text"
                        value={slot.title}
                        onChange={(e) => updateSlot(cat, i, "title", e.target.value)}
                        placeholder={hint.title}
                        className="w-full px-3 py-2 bg-surface border hairline rounded-md font-serif text-base focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted/60"
                        aria-label={`${meta.label} — item ${i + 1} title`}
                      />
                      <input
                        type="text"
                        value={slot.why}
                        onChange={(e) => updateSlot(cat, i, "why", e.target.value)}
                        placeholder={hint.why}
                        className="w-full px-3 py-2 bg-surface border hairline rounded-md font-serif text-base focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted/60"
                        aria-label={`${meta.label} — item ${i + 1} reason`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {picked.length > 0 && (
          <div className="sticky bottom-4 z-10 -mx-2">
            <div className="bg-background/80 backdrop-blur-sm border hairline rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-muted font-mono tabular-nums">
                {totalFilled} / {totalRequired} to unlock
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
