"use client";

import type { Recommendation } from "@/lib/types";
import { useRating } from "@/lib/useRating";
import { findLink } from "@/lib/findLink";

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

export function RecCard({
  rec,
  hero = false,
  profileId,
}: {
  rec: Recommendation;
  hero?: boolean;
  profileId: string;
}) {
  const [rating, rate] = useRating(profileId, { id: rec.id, title: rec.title });
  const link = findLink(rec.category, rec.title, rec.creator);

  if (hero) return <HeroRecCard rec={rec} rating={rating} rate={rate} link={link} />;

  return (
    <article
      className="group rise border hairline rounded-lg p-5 bg-surface/40 hover:bg-surface transition-colors flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          {CATEGORY_LABEL[rec.category]}
        </span>
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted hover:text-foreground transition-colors focus-ring rounded-full px-1"
        >
          Find on {link.label} ↗
        </a>
      </div>

      <h3 className="font-serif text-xl leading-tight mb-1">{rec.title}</h3>
      {(rec.creator || rec.year) && (
        <p className="text-sm text-muted mb-3">
          {rec.creator}
          {rec.creator && rec.year && " · "}
          {rec.year}
        </p>
      )}

      <div className="mb-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-1.5">
          Why this, for you
        </p>
        <p className="text-foreground/85 leading-relaxed text-sm">{rec.whyYou}</p>
      </div>

      <p className="text-xs text-muted leading-relaxed mb-4 italic">{rec.hook}</p>

      <div className="flex items-center justify-between mt-auto gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {rec.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 border hairline rounded-full text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <RatingPills rating={rating} rate={rate} />
      </div>
    </article>
  );
}

function HeroRecCard({
  rec,
  rating,
  rate,
  link,
}: {
  rec: Recommendation;
  rating: ReturnType<typeof useRating>[0];
  rate: ReturnType<typeof useRating>[1];
  link: { href: string; label: string };
}) {
  return (
    <article className="rise relative border hairline-strong rounded-xl p-8 md:p-10 bg-surface/60 paper-grain overflow-hidden">
      <div className="flex items-center justify-between mb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>The hero pick</span>
          <span>·</span>
          <span>{CATEGORY_LABEL[rec.category]}</span>
        </div>
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors focus-ring rounded-full px-1"
        >
          Find on {link.label} ↗
        </a>
      </div>

      <h2 className="font-serif-display text-3xl md:text-5xl leading-[1.05] tracking-tight italic mb-2 text-balance">
        {rec.title}
      </h2>
      {(rec.creator || rec.year) && (
        <p className="text-sm text-muted mb-7 font-mono tracking-wide">
          {rec.creator}
          {rec.creator && rec.year && " · "}
          {rec.year}
        </p>
      )}

      <div className="w-16 h-px bg-accent mb-6" />

      <p className="text-lg md:text-xl leading-relaxed font-serif text-foreground/90 max-w-2xl mb-5">
        {rec.whyYou}
      </p>

      <p className="text-sm text-muted italic leading-relaxed max-w-2xl mb-8">{rec.hook}</p>

      <div className="flex items-center justify-end">
        <RatingPills rating={rating} rate={rate} />
      </div>
    </article>
  );
}

function RatingPills({
  rating,
  rate,
}: {
  rating: ReturnType<typeof useRating>[0];
  rate: ReturnType<typeof useRating>[1];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <RatingPill active={rating === "love"} onClick={() => rate("love")} label="More like this">
        More
      </RatingPill>
      <RatingPill active={rating === "tried"} onClick={() => rate("tried")} label="I tried this">
        Tried it
      </RatingPill>
      <RatingPill active={rating === "nope"} onClick={() => rate("nope")} label="Less like this">
        Less
      </RatingPill>
    </div>
  );
}

function RatingPill({
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
      className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors focus-ring ${
        active
          ? "bg-accent text-accent-ink border-transparent"
          : "text-muted hover:text-foreground opacity-70 hover:opacity-100 hairline"
      }`}
    >
      {children}
    </button>
  );
}
