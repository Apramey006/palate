"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GenerateResponse } from "@/lib/types";
import { encodeProfile } from "@/lib/encode";

const PROMPTS = [
  "Describe a movie that wrecked you, and what the wreckage felt like.",
  "A book you keep pressing on people, and what you wish they'd see in it.",
  "An album or song that sounds like a specific place or season to you.",
  "A meal or dish that feels like home — or somewhere you want to go.",
  "A place you've been that stuck. The boring kind of detail is what we want.",
  "Something everyone loves that you actively don't, and why.",
];

const PLACEHOLDER = `e.g. I love Good Time — the anxiety of it, the way it never lets you breathe. I like Bon Iver's first album because it sounds like a cold cabin. I hate long meandering movies where nothing happens. I want food that tastes like a place, not food that looks nice on Instagram. Favorite city is Tokyo, partly for Golden Gai — six alleys of tiny bars that don't care if you're there.`;

export default function NewTastePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (text.trim().length < 20) {
      setError("Just a few more sentences — at least 20 characters.");
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
      // Stash the recs in sessionStorage so the results page can render without a second round-trip.
      sessionStorage.setItem(
        `palate:recs:${data.profile.headline}`,
        JSON.stringify(data.recs)
      );
      if (data.demo) {
        sessionStorage.setItem("palate:demo", "1");
      } else {
        sessionStorage.removeItem("palate:demo");
      }
      const encoded = encodeProfile(data.profile);
      router.push(`/taste/${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 w-full">
      <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">Step 1 of 1</p>
      <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight mb-4">
        Describe what you love.
      </h1>
      <p className="text-muted leading-relaxed mb-8">
        Write a paragraph. Mix categories — movies, books, music, food, places. Say what you love
        <em> and why</em>. Say what you can&apos;t stand. The &quot;why&quot; is the whole point.
      </p>

      <details className="mb-6 group">
        <summary className="text-sm text-muted cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform inline-block">→</span>
          Need a prompt?
        </summary>
        <ul className="mt-3 space-y-2 text-sm text-muted pl-6">
          {PROMPTS.map((p) => (
            <li key={p} className="leading-relaxed">• {p}</li>
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
        <div className="flex items-center justify-between text-xs text-muted">
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Reading your taste…" : "Build my taste profile"}
          {!loading && <span aria-hidden>→</span>}
        </button>
      </form>
    </div>
  );
}
