import type { TasteProfile } from "@/lib/types";
import { profileSerial } from "@/lib/serial";

export function TasteProfileCard({
  profile,
  demo,
  cardRef,
}: {
  profile: TasteProfile;
  demo?: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const serial = profileSerial(profile);
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <section>
      {demo && (
        <div className="mb-6 text-xs text-muted border hairline rounded-md px-3 py-2 bg-surface/40">
          Demo mode — set <code className="font-mono">GOOGLE_API_KEY</code> to generate your own profile.
        </div>
      )}

      <div
        ref={cardRef}
        data-card="taste-profile"
        className="relative paper-grain border hairline-strong rounded-xl p-8 md:p-10 shadow-[0_2px_12px_-2px_rgba(26,24,21,0.12),inset_0_0_0_0.5px_rgba(255,255,255,0.35)] overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted beat-fade-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>Palate</span>
          <span>·</span>
          <span>A Taste Profile</span>
        </div>

        <h1 className="font-serif-display text-4xl md:text-[3.25rem] leading-[1.05] tracking-tight italic mb-5 max-w-2xl text-balance beat-headline">
          &ldquo;{profile.headline}&rdquo;
        </h1>

        <div className="w-16 h-px bg-accent mb-5 beat-rule" />

        <p className="text-lg text-foreground/85 leading-relaxed max-w-2xl mb-10 font-serif beat-fade-2">
          {profile.summary}
        </p>

        {profile.tensions && profile.tensions.length > 0 && (
          <div className="mb-10 beat-fade-2 max-w-2xl border-l-2 border-accent/60 pl-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted mb-3">
              Tensions
            </p>
            <ul className="space-y-3 font-serif text-base leading-relaxed text-foreground/85">
              {profile.tensions.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 beat-fade-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-4 pb-2 border-b hairline">
              Dimensions
            </p>
            <dl className="space-y-4">
              {profile.dimensions.map((d) => (
                <div key={d.label}>
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <dt className="text-sm font-medium">{d.label}</dt>
                    <dd
                      aria-label={`Strength ${Math.round(d.strength * 10)} of 10`}
                      className="flex-shrink-0 w-16 h-px bg-hairline relative overflow-hidden"
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-accent"
                        style={{ width: `${Math.max(6, d.strength * 100)}%` }}
                      />
                    </dd>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{d.description}</p>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-3 pb-2 border-b hairline">
                You respond to
              </p>
              <ul className="text-sm leading-relaxed space-y-1 font-serif">
                {profile.loves.map((l) => (
                  <li key={l}>— {l}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-3 pb-2 border-b hairline">
                You walk away from
              </p>
              <ul className="text-sm leading-relaxed space-y-1 font-serif italic text-muted">
                {profile.avoids.map((a) => (
                  <li key={a}>— {a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t hairline flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted beat-fade-3">
          <span>Profile № {serial}</span>
          <span>{dateLabel}</span>
        </div>
      </div>
    </section>
  );
}
