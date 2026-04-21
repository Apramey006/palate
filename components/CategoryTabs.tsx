"use client";

import type { Category } from "@/lib/types";

export type TabValue = "all" | Category;

const CATEGORY_LABEL: Record<Category, string> = {
  film: "Films",
  book: "Books",
  music: "Music",
  food: "Food",
  place: "Places",
  show: "Shows",
  podcast: "Podcasts",
  game: "Games",
};

// Order tabs in a stable, editorial way — rough "how likely to be represented" order.
const TAB_ORDER: Category[] = [
  "film",
  "book",
  "music",
  "food",
  "place",
  "show",
  "podcast",
  "game",
];

export function CategoryTabs({
  counts,
  active,
  onChange,
}: {
  counts: Partial<Record<Category, number>>;
  active: TabValue;
  onChange: (t: TabValue) => void;
}) {
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const present = TAB_ORDER.filter((c) => (counts[c] ?? 0) > 0);

  return (
    <div
      role="tablist"
      aria-label="Filter recommendations by category"
      className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1"
    >
      <Tab
        label="All"
        count={total}
        active={active === "all"}
        onClick={() => onChange("all")}
      />
      {present.map((cat) => (
        <Tab
          key={cat}
          label={CATEGORY_LABEL[cat]}
          count={counts[cat] ?? 0}
          active={active === cat}
          onClick={() => onChange(cat)}
        />
      ))}
    </div>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap focus-ring ${
        active
          ? "bg-foreground text-background"
          : "text-muted hover:text-foreground border hairline"
      }`}
    >
      <span>{label}</span>
      <span
        className={`font-mono text-[10px] tabular-nums ${
          active ? "opacity-70" : "opacity-50"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
