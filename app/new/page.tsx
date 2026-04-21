"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GenerateResponse } from "@/lib/types";
import { encodeProfile } from "@/lib/encode";
import { saveProfileToIndex } from "@/lib/ratings";

type SectionKey = "films" | "books" | "music" | "food" | "places" | "other";

interface Section {
  key: SectionKey;
  label: string;
  prompt: string;
  placeholder: string;
}

const SECTIONS: Section[] = [
  {
    key: "films",
    label: "Films & shows",
    prompt: "A film that wrecked you, or one you keep rewatching. What made it stick?",
    placeholder:
      "e.g. Good Time — the anxiety of it, the way it never lets you breathe. I hate long meandering movies where nothing happens.",
  },
  {
    key: "books",
    label: "Books",
    prompt: "A book you press on people. What you wish they'd see in it.",
    placeholder:
      "e.g. A Little Life broke me for a week. I love writers who trust the reader — Stoner, Gilead. I'll give up on a book if it's too clever.",
  },
  {
    key: "music",
    label: "Music",
    prompt: "An album or song that sounds like a specific place or season to you.",
    placeholder:
      "e.g. Bon Iver's first album sounds like a cold cabin. Big Thief live. I can't with anything that's trying to sound like the 80s.",
  },
  {
    key: "food",
    label: "Food",
    prompt: "A dish or meal that feels like home — or somewhere you want to go.",
    placeholder:
      "e.g. I want food that tastes like a place, not food that looks nice on Instagram. Hainanese chicken rice, cacio e pepe, anything you eat standing up.",
  },
  {
    key: "places",
    label: "Places",
    prompt: "A place that stuck. The boring kind of detail is what we want.",
    placeholder:
      "e.g. Tokyo, partly for Golden Gai — six alleys of tiny bars that don't care if you're there. I don't like cities that feel designed for photos.",
  },
  {
    key: "other",
    label: "Anything else",
    prompt: "A surprising taste. Something everyone loves that you don't, or vice versa.",
    placeholder:
      "e.g. I hate when something feels trying-too-hard. I'll forgive a lot for a voice that feels honest.",
  },
];

const MIN_CHARS_TOTAL = 40;
const MAX_CHARS_TOTAL = 6000;

const LOADING_PHRASES = [
  "Looking for texture, not labels…",
  "Noticing what you walk away from…",
  "Reading between your lines…",
  "Sketching a portrait…",
  "Finding the contradictions…",
];

type Answers = Record<SectionKey, string>;
const EMPTY_ANSWERS: Answers = {
  films: "",
  books: "",
  music: "",
  food: "",
  places: "",
  other: "",
};

function composeSourceText(a: Answers): string {
  const parts: string[] = [];
  for (const section of SECTIONS) {
    const txt = a[section.key].trim();
    if (!txt) continue;
    parts.push(`${section.label.toUpperCase()}: ${txt}`);
  }
  return parts.join("\n\n");
}

export default function NewTastePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const totalChars = useMemo(
    () =>
      Object.values(answers).reduce((n, s) => n + s.trim().length, 0),
    [answers],
  );
  const filledSections = useMemo(
    () => Object.values(answers).filter((s) => s.trim().length > 0).length,
    [answers],
  );

  useEffect(() => {
    if (!loading) return;
    intervalRef.current = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 2400);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (totalChars < MIN_CHARS_TOTAL) {
      setError(
        `Tell me a little more — at least ${MIN_CHARS_TOTAL} characters total across any of the sections.`,
      );
      return;
    }
    if (totalChars > MAX_CHARS_TOTAL) {
      setError(`That's a lot — keep it under ${MAX_CHARS_TOTAL} characters total.`);
      return;
    }
    const text = composeSourceText(answers);
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

  const canSubmit = totalChars >= MIN_CHARS_TOTAL && totalChars <= MAX_CHARS_TOTAL;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 w-full">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-4">Step 1 of 1</p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight tracking-tight mb-4">
        Describe what you love.
      </h1>
      <p className="text-muted leading-relaxed mb-10">
        Fill in whatever sections you want — skip the rest. Short, specific, and{" "}
        <em>why</em> matter more than long.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {SECTIONS.map((section, i) => (
          <SectionField
            key={section.key}
            section={section}
            index={i + 1}
            total={SECTIONS.length}
            value={answers[section.key]}
            disabled={loading}
            onChange={(v) =>
              setAnswers((prev) => ({ ...prev, [section.key]: v }))
            }
          />
        ))}

        <div className="sticky bottom-4 z-10 -mx-2">
          <div className="bg-background/80 backdrop-blur-sm border hairline rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted font-mono tabular-nums">
              {filledSections}/{SECTIONS.length} sections ·{" "}
              <span
                className={
                  totalChars < MIN_CHARS_TOTAL
                    ? "text-muted"
                    : totalChars > MAX_CHARS_TOTAL
                    ? "text-accent"
                    : "text-foreground"
                }
              >
                {totalChars} chars
              </span>
            </div>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="inline-flex items-center justify-center gap-2 bg-accent text-accent-ink px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
            >
              Build my taste profile
              <span aria-hidden>→</span>
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-accent text-right" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

function SectionField({
  section,
  index,
  total,
  value,
  onChange,
  disabled,
}: {
  section: Section;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 gap-3">
        <h2 className="font-serif text-xl tracking-tight">{section.label}</h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed mb-3">{section.prompt}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={section.placeholder}
        rows={3}
        disabled={disabled}
        className="w-full p-4 bg-surface border hairline rounded-lg resize-y font-serif text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 placeholder:text-muted/70"
      />
    </section>
  );
}
