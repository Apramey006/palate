"use client";

import { useState } from "react";

export function SaveCardButton({
  targetRef,
  filename = "palate-taste-profile.png",
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  async function save() {
    if (!targetRef.current) return;
    setState("working");
    try {
      // Dynamic import keeps html-to-image out of the initial bundle — it's only loaded
      // the moment someone asks to export.
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("Failed to export card:", err);
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const labels = {
    idle: "Save as card",
    working: "Rendering…",
    done: "Saved ↓",
    error: "Try again",
  } as const;

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "working"}
      className="inline-flex items-center gap-2 border hairline px-4 py-2 rounded-full text-sm hover:bg-surface transition-colors disabled:opacity-60 focus-ring"
    >
      {labels[state]}
      <span aria-hidden>{state === "done" ? "✓" : "↓"}</span>
    </button>
  );
}
