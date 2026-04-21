"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GenerateResponse } from "@/lib/types";
import { encodeProfile } from "@/lib/encode";
import { saveProfileToIndex } from "@/lib/ratings";

const PROMPTS = [
  "Describe a movie that wrecked you, and what the wreckage felt like.",
  "A book you keep pressing on people, and what you wish they'd see in it.",
  "An album or song that sounds like a specific place or season to you.",
  "A meal or dish that feels like home — or somewhere you want to go.",
  "A place you've been that stuck. The boring kind of detail is what we want.",
  "Something everyone loves that you actively don't, and why.",
];

const LOADING_PHRASES = [
  "Looking for texture, not labels…",
  "Noticing what you walk away from…",
  "Reading between your lines…",
  "Sketching a portrait…",
  "Finding the contradictions…",
];

const PLACEHOLDER = `e.g. I love Good Time — the anxiety of it, the way it never lets you breathe. I like Bon Iver's first album because it sounds like a cold cabin. I hate long meandering movies where nothing happens. I want food that tastes like a place, not food that looks nice on Instagram. Favorite city is Tokyo, partly for Golden Gai — six alleys of tiny bars that don't care if you're there.`;

export default function NewTastePage() {
  const router = useRouter();
  const [text, setText] = useState("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (text.trim().length < 20) {
      setError("Tell me a little more — a few sentences, not a few words.");
      return;
    }
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
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-4">Step 1 of 1</p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight tracking-tight mb-4">
        Describe what you love.
      </h1>
      <p className="text-muted leading-relaxed mb-8">
        Write a paragraph. Mix categories — movies, books, music, food, places. Say what you love{" "}
        <em>and why</em>. Say what you can&apos;t stand. The &ldquo;why&rdquo; is the whole point.
      </p>

      <details className="mb-6 group">
        <summary className="text-sm text-muted cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform inline-block">→</span>
          Need a prompt?
        </summary>
        <ul className="mt-3 space-y-2 text-sm text-muted pl-6">
          {PROMPTS.map((p) => (
            <li key={p} className="leading-relaxed">
              • {p}
            </li>
          ))}
        </ul>
      </details>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          disabled={loading}
          className="w-full p-5 bg-surface border hairline rounded-lg resize-y font-serif text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 placeholder:text-muted/70"
        />
        <div className="flex items-center justify-between text-xs text-muted font-mono">
          <span>{text.length} / 4000</span>
          <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
        {error && (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || text.trim().length < 20}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
        >
          Build my taste profile
          <span aria-hidden>→</span>
        </button>
      </form>
    </div>
  );
}
