import type { Category, CategoryProfile } from "@/lib/types";

const CATEGORY_LABEL: Record<Category, string> = {
  film: "Film",
  book: "Book",
  music: "Music",
  food: "Food",
  place: "Place",
  show: "Show",
  podcast: "Podcast",
  game: "Game",
};

export function CategoryPortraits({ profiles }: { profiles: CategoryProfile[] }) {
  if (!profiles || profiles.length === 0) return null;
  return (
    <section className="rise">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-serif-display text-2xl md:text-3xl tracking-tight">
          Taste by category
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          {profiles.length} {profiles.length === 1 ? "portrait" : "portraits"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((p) => (
          <article
            key={p.category}
            className="border hairline rounded-lg p-5 bg-surface/40 flex flex-col"
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-3">
              {CATEGORY_LABEL[p.category]}
            </span>
            <h3 className="font-serif text-xl italic leading-snug mb-3">
              &ldquo;{p.headline}&rdquo;
            </h3>
            <div className="w-10 h-px bg-accent mb-3" />
            <p className="text-sm text-foreground/80 leading-relaxed mb-4 font-serif">
              {p.summary}
            </p>
            <div className="mt-auto pt-3 border-t hairline">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted mb-1">
                Signature
              </p>
              <p className="text-sm font-serif italic">{p.signature}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
