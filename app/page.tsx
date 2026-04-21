import Link from "next/link";
import { RecentProfiles } from "@/components/RecentProfiles";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 rise">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-6">A taste profiler</p>
        <h1 className="font-serif-display text-5xl md:text-6xl leading-[1.02] tracking-tight">
          Tell Palate what you love.
          <br />
          <span className="text-muted italic">It will figure out why.</span>
        </h1>
        <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
          Most recommenders ask what genre you like. Palate asks you to describe a few things
          you&apos;ve loved — and why. Then it hands back a portrait of your taste, one thing you
          should try this week, and ten more to sit with.
        </p>
        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity focus-ring"
          >
            Profile my taste
            <span aria-hidden>→</span>
          </Link>
          <span className="text-sm text-muted">Takes a minute. Nothing to install.</span>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Describe",
            body: "Not a survey. You write a paragraph about what you love. Palate reads for texture, not labels.",
          },
          {
            title: "Reflect",
            body: "Palate hands back a short portrait of your taste — the tensions, the loves, the allergies. Most will ring true. Some won't. That's the point.",
          },
          {
            title: "Explore",
            body: "One pick worth your time this week, and ten more across film, books, music, food, and places. Each one tells you why it fits — in your own language.",
          },
        ].map((step) => (
          <div key={step.title} className="rise">
            <h3 className="font-serif text-xl mb-2">{step.title}</h3>
            <p className="text-muted leading-relaxed text-sm">{step.body}</p>
          </div>
        ))}
      </section>

      <RecentProfiles />
    </div>
  );
}
