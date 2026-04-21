"use client";

import type { Recommendation } from "@/lib/types";
import { useState } from "react";

const CATEGORY_LABEL: Record<Recommendation["category"], string> = {
  film: "Film",
  book: "Book",
  music: "Music",
  food: "Food",
  place: "Place",
  show: "Show",
  podcast: "Podcast",
  game: "Game",
};

export function RecCard({ rec, hero = false }: { rec: Recommendation; hero?: boolean }) {
  const [rating, setRating] = useState<"love" | "meh" | "nope" | null>(null);

  return (
    <article
      className={`group rise border hairline rounded-lg p-5 bg-surface/40 hover:bg-surface transition-colors ${
        hero ? "md:p-7" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">
          {CATEGORY_LABEL[rec.category]}
        </span>
        <span className="text-[10px] text-muted font-mono">
          {Math.round(rec.confidence * 100)}% fit
        </span>
      </div>

      <h3
        className={`font-serif leading-tight ${hero ? "text-3xl md:text-4xl" : "text-xl"} mb-1`}
      >
        {rec.title}
      </h3>
      {(rec.creator || rec.year) && (
        <p className="text-sm text-muted mb-3">
          {rec.creator}
          {rec.creator && rec.year && " · "}
          {rec.year}
        </p>
      )}

      <p className={`text-foreground/90 leading-relaxed mb-4 ${hero ? "text-lg" : "text-sm"}`}>
        {rec.hook}
      </p>

      <div className="mb-4 pt-4 border-t hairline">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-1.5">Why you</p>
        <p className={`text-foreground/80 leading-relaxed ${hero ? "text-base" : "text-sm"}`}>
          {rec.whyYou}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {rec.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 border hairline rounded-full text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <RatingButton active={rating === "love"} onClick={() => setRating("love")} label="Love">
            ♥
          </RatingButton>
          <RatingButton active={rating === "meh"} onClick={() => setRating("meh")} label="Meh">
            ◯
          </RatingButton>
          <RatingButton active={rating === "nope"} onClick={() => setRating("nope")} label="Nope">
            ✕
          </RatingButton>
        </div>
      </div>
    </article>
  );
}

function RatingButton({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`w-7 h-7 rounded-full text-xs flex items-center justify-center border hairline transition-colors ${
        active ? "bg-accent text-accent-ink border-transparent" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
