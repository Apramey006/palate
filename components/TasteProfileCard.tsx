import type { TasteProfile } from "@/lib/types";

export function TasteProfileCard({ profile, demo }: { profile: TasteProfile; demo?: boolean }) {
  return (
    <section className="rise">
      {demo && (
        <div className="mb-6 text-xs text-muted border hairline rounded px-3 py-2 bg-surface/40">
          Demo mode — set <code className="font-mono">ANTHROPIC_API_KEY</code> to generate your own
          profile.
        </div>
      )}
      <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Your taste</p>
      <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight mb-5">
        {profile.headline}
      </h1>
      <p className="text-lg text-foreground/80 leading-relaxed max-w-2xl">{profile.summary}</p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted mb-4">Dimensions</p>
          <ul className="space-y-3">
            {profile.dimensions.map((d) => (
              <li key={d.label}>
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className="text-xs text-muted font-mono">
                    {Math.round(d.strength * 100)}
                  </span>
                </div>
                <div className="h-1 bg-hairline rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.round(d.strength * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{d.description}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted mb-3">You respond to</p>
            <div className="flex flex-wrap gap-2">
              {profile.loves.map((l) => (
                <span
                  key={l}
                  className="text-sm px-3 py-1 rounded-full border hairline bg-surface/60"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted mb-3">You walk away from</p>
            <div className="flex flex-wrap gap-2">
              {profile.avoids.map((a) => (
                <span
                  key={a}
                  className="text-sm px-3 py-1 rounded-full border hairline text-muted"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
