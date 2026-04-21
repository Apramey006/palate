"use client";

import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Palate taste profile", url });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 border hairline px-4 py-2 rounded-full text-sm hover:bg-surface transition-colors"
    >
      {copied ? "Link copied" : "Share profile"}
      <span aria-hidden>{copied ? "✓" : "↗"}</span>
    </button>
  );
}
