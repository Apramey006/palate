"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center rise">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-6">500</p>
      <h1 className="font-serif-display text-4xl md:text-5xl leading-tight italic mb-4">
        Something came loose.
      </h1>
      <p className="text-muted leading-relaxed max-w-sm mx-auto mb-10">
        Palate ran into an unexpected error. You can try again, or head back to the start.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 bg-accent text-accent-ink px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity focus-ring"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 border hairline px-5 py-2.5 rounded-full text-sm hover:bg-surface transition-colors focus-ring"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
