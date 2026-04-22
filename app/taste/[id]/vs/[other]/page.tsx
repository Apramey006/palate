import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { decodeProfile } from "@/lib/encode";
import { profileSerial } from "@/lib/serial";
import type { TasteProfile } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; other: string }>;
}): Promise<Metadata> {
  const { id, other } = await params;
  if (id === other) return { title: "Palate" };
  const a = decodeProfile(id);
  const b = decodeProfile(other);
  if (!a || !b) return { title: "Palate" };
  return {
    title: `${a.headline} vs. ${b.headline} — Palate`,
    description: `Two taste portraits, side by side.`,
  };
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function overlap(a: string[], b: string[]): { shared: string[]; onlyA: string[]; onlyB: string[] } {
  const bNorm = new Set(b.map(norm));
  const aNorm = new Set(a.map(norm));
  const shared = a.filter((x) => bNorm.has(norm(x)));
  const onlyA = a.filter((x) => !bNorm.has(norm(x)));
  const onlyB = b.filter((x) => !aNorm.has(norm(x)));
  return { shared, onlyA, onlyB };
}

function compareDimensions(a: TasteProfile, b: TasteProfile) {
  const byLabelB = new Map(b.dimensions.map((d) => [norm(d.label), d]));
  const usedB = new Set<string>();
  const shared: { a: TasteProfile["dimensions"][number]; b: TasteProfile["dimensions"][number] }[] = [];
  const onlyA: TasteProfile["dimensions"] = [];
  for (const da of a.dimensions) {
    const match = byLabelB.get(norm(da.label));
    if (match) {
      shared.push({ a: da, b: match });
      usedB.add(norm(da.label));
    } else {
      onlyA.push(da);
    }
  }
  const onlyB = b.dimensions.filter((d) => !usedB.has(norm(d.label)));
  return { shared, onlyA, onlyB };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string; other: string }>;
}) {
  const { id, other } = await params;
  // Guard against self-compare — would render 100% affinity, empty divergence
  // columns, and a mournful tautology. Send them back to the single-profile view.
  if (id === other) notFound();
  const a = decodeProfile(id);
  const b = decodeProfile(other);
  if (!a || !b) notFound();

  const dims = compareDimensions(a, b);
  const loves = overlap(a.loves, b.loves);
  const avoids = overlap(a.avoids, b.avoids);

  const sharedCount = dims.shared.length + loves.shared.length + avoids.shared.length;
  const totalPossible = Math.max(
    a.dimensions.length + a.loves.length + a.avoids.length,
    b.dimensions.length + b.loves.length + b.avoids.length,
  );
  const affinityPct = totalPossible === 0 ? 0 : Math.round((sharedCount / totalPossible) * 100);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-3 flex-wrap">
        <Link
          href={`/taste/${id}`}
          className="text-sm text-muted hover:text-foreground transition-colors focus-ring rounded-sm"
        >
          ← Back to profile
        </Link>
        <Link
          href="/new"
          className="text-sm text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-hairline"
        >
          Make your own →
        </Link>
      </div>

      <header className="mb-14 rise">
        <div className="flex items-center gap-2 mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>Palate</span>
          <span>·</span>
          <span>Two portraits</span>
        </div>
        <h1 className="font-serif-display text-4xl md:text-5xl leading-tight tracking-tight italic mb-3 text-balance">
          {a.headline}
          <span className="text-muted not-italic"> vs. </span>
          {b.headline}
        </h1>
        <p className="text-muted text-sm max-w-xl">
          {sharedCount === 0
            ? "Two very different readers — nothing lines up exactly. The interesting part is what each walks toward."
            : "A rough overlap. Shared axes light up; the rest is where you diverge."}
        </p>
        {sharedCount > 0 && (
          <>
            <div className="mt-8 flex items-baseline gap-3">
              <span className="font-serif-display text-5xl tracking-tight tabular-nums">
                {affinityPct}%
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted">
                rough affinity
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Affinity = shared dimensions, loves, and avoids, over the larger of the two
              profiles. A rough gauge, not a score. Labels that mean the same thing but differ
              in wording won&apos;t match.
            </p>
          </>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        <Pane profile={a} side="left" />
        <Pane profile={b} side="right" />
      </div>

      <div className="space-y-14 rise">
        <Section title="Shared dimensions" count={dims.shared.length}>
          {dims.shared.length === 0 ? (
            <p className="text-sm text-muted italic">No labels match exactly — different readers of their own taste.</p>
          ) : (
            <ul className="space-y-4">
              {dims.shared.map(({ a: da, b: db }) => (
                <li key={da.label} className="border-l-2 border-accent pl-5 py-1">
                  <p className="font-serif text-lg mb-1">{da.label}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted leading-relaxed">
                    <p>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70 block mb-1">
                        Left reading
                      </span>
                      {da.description}
                    </p>
                    <p>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70 block mb-1">
                        Right reading
                      </span>
                      {db.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Shared loves" count={loves.shared.length}>
          <ItemList items={loves.shared} empty="No overlap in what they respond to." />
        </Section>

        <Section title="Shared walk-aways" count={avoids.shared.length}>
          <ItemList items={avoids.shared} empty="No overlap in what they walk away from." />
        </Section>

        <Section title="Where they diverge">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DivergeColumn
              headline={a.headline}
              dims={dims.onlyA}
              loves={loves.onlyA}
              avoids={avoids.onlyA}
            />
            <DivergeColumn
              headline={b.headline}
              dims={dims.onlyB}
              loves={loves.onlyB}
              avoids={avoids.onlyB}
            />
          </div>
        </Section>
      </div>

      <footer className="mt-20 pt-8 border-t hairline text-center">
        <p className="text-sm text-muted mb-4">
          Palate reads taste. Two people, two portraits, one rough overlap.
        </p>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 bg-accent text-accent-ink px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity focus-ring"
        >
          Make your own
          <span aria-hidden>→</span>
        </Link>
      </footer>
    </div>
  );
}

function Pane({ profile, side }: { profile: TasteProfile; side: "left" | "right" }) {
  const serial = profileSerial(profile);
  return (
    <article className="border hairline-strong rounded-xl p-6 bg-surface/40 paper-grain">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted mb-3">
        {side === "left" ? "Left profile" : "Right profile"} · № {serial}
      </p>
      <h2 className="font-serif-display text-2xl md:text-3xl italic leading-tight mb-3 text-balance">
        &ldquo;{profile.headline}&rdquo;
      </h2>
      <div className="w-10 h-px bg-accent mb-3" />
      <p className="text-sm text-foreground/80 leading-relaxed font-serif mb-4">
        {profile.summary}
      </p>
      {profile.tensions && profile.tensions.length > 0 && (
        <div className="border-l-2 border-accent/60 pl-4 mt-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted mb-2">
            Tensions
          </p>
          <ul className="space-y-2 text-sm font-serif text-foreground/80 leading-relaxed">
            {profile.tensions.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b hairline">
        <h2 className="font-serif text-xl tracking-tight">{title}</h2>
        {typeof count === "number" && (
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function ItemList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted italic">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => (
        <li
          key={i}
          className="text-sm px-3 py-1 border-l-2 border-accent bg-surface/40 font-serif"
        >
          {i}
        </li>
      ))}
    </ul>
  );
}

function DivergeColumn({
  headline,
  dims,
  loves,
  avoids,
}: {
  headline: string;
  dims: TasteProfile["dimensions"];
  loves: string[];
  avoids: string[];
}) {
  return (
    <div>
      <p className="font-serif italic text-sm text-muted mb-4 line-clamp-2">
        &ldquo;{headline}&rdquo;
      </p>
      {dims.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted mb-2">
            Only here
          </p>
          <ul className="space-y-1.5 text-sm">
            {dims.map((d) => (
              <li key={d.label} className="font-serif">
                — {d.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {loves.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted mb-2">
            Responds to
          </p>
          <ul className="space-y-1 text-sm text-foreground/80">
            {loves.map((l) => (
              <li key={l} className="font-serif">— {l}</li>
            ))}
          </ul>
        </div>
      )}
      {avoids.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted mb-2">
            Walks away from
          </p>
          <ul className="space-y-1 text-sm text-muted italic">
            {avoids.map((a) => (
              <li key={a} className="font-serif">— {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
