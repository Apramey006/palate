import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 rise">
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-6">A taste profiler</p>
        <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] tracking-tight">
          Tell Palate what you love.
          <br />
          <span className="text-muted">It will figure out why.</span>
        </h1>
        <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
          Most recommendation engines ask what genre you like. Palate asks you to describe a few
          things you&apos;ve loved — movies, books, music, food, places, anything — and why. Then it
          builds a portrait of your taste and hands you a hero pick plus ten more you probably
          haven&apos;t found yet.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Profile my taste
            <span aria-hidden>→</span>
          </Link>
          <span className="text-sm text-muted">~2 minutes. Nothing to install.</span>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Describe",
            body: "Not a survey. You write a paragraph about a handful of things you love. Palate reads for texture, not labels.",
          },
          {
            title: "Reflect",
            body: "Palate hands back a short portrait of your taste — the tensions, the loves, the allergies. Most of it will ring true. Some of it won't. That's the point.",
          },
          {
            title: "Explore",
            body: "One hero pick and ten more across film, books, music, food, and places. Each tells you why it fits — in your own language.",
          },
        ].map((step) => (
          <div key={step.title} className="rise">
            <h3 className="font-serif text-xl mb-2">{step.title}</h3>
            <p className="text-muted leading-relaxed text-sm">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
