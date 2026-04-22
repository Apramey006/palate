import Link from "next/link";
import { RecentProfiles } from "@/components/RecentProfiles";
import { encodeProfile } from "@/lib/encode";
import { mockResponse } from "@/lib/mock";

// Pre-encoded sample profile — lets a first-time visitor see what a finished
// artifact looks like before they pay the intake tax. Computed once per build.
const SAMPLE_URL = `/taste/${encodeProfile(mockResponse("sample").profile)}`;

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-14 rise">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-6">A taste profiler</p>
        <h1 className="font-serif-display text-5xl md:text-6xl leading-[1.02] tracking-tight">
          Tell Palate what you love.
          <br />
          <span className="text-muted italic">It will figure out why.</span>
        </h1>
        <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
          Most recommenders ask what genre you like. Palate asks for a handful of specific things
          you&apos;ve loved — and why — then hands back a portrait of your taste, one pick worth
          your week, and ten more to sit with.
        </p>
        <div className="mt-10 flex items-center gap-5 flex-wrap">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity focus-ring"
          >
            Profile my taste
            <span aria-hidden>→</span>
          </Link>
          <Link
            href={SAMPLE_URL}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors underline underline-offset-4 decoration-hairline hover:decoration-current"
          >
            See a sample portrait first
            <span aria-hidden>↗</span>
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted">About five minutes. No sign-in.</p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            n: "01",
            title: "Describe",
            body: "Pick the categories you care about. Name a few things you love and say — in your own words — what specifically got you.",
          },
          {
            n: "02",
            title: "Reflect",
            body: "Palate reads between the lines and hands back a short portrait — the tensions, the loves, the walk-aways. Most will ring true. Some won't. That's the point.",
          },
          {
            n: "03",
            title: "Explore",
            body: "One pick worth your week, and ten more across film, books, music, food, and places. Each says why it fits — in your language, not a genre tag.",
          },
        ].map((step) => (
          <div key={step.n} className="rise">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
              {step.n}
            </p>
            <h3 className="font-serif text-xl mb-2 tracking-tight">{step.title}</h3>
            <p className="text-muted leading-relaxed text-sm">{step.body}</p>
          </div>
        ))}
      </section>

      <RecentProfiles />
    </div>
  );
}
