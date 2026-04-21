import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center rise">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-6">404</p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight italic mb-4">
        This profile has faded.
      </h1>
      <p className="text-muted leading-relaxed max-w-sm mx-auto mb-10">
        The link may have been truncated, or the profile was shared in a form Palate can&apos;t read anymore.
      </p>
      <Link
        href="/new"
        className="inline-flex items-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity focus-ring"
      >
        Profile your own taste
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
