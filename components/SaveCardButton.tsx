"use client";

import { useState } from "react";

const EXPORT_WIDTH = 1080;

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
      // Dynamic-import html-to-image so it stays out of the initial JS bundle.
      const { toPng, toBlob } = await import("html-to-image");

      // Clone the card into a fixed-width 1080px stage so the exported PNG looks identical
      // whether the user hits Save on a phone (375px viewport) or a desktop (1200px+).
      // Without this, the card inherits the current viewport width and mobile users get
      // a narrow, stacked image that's unshareable.
      const clone = targetRef.current.cloneNode(true) as HTMLDivElement;
      const stage = document.createElement("div");
      stage.style.position = "fixed";
      stage.style.top = "0";
      stage.style.left = "-10000px"; // off-screen so there's no flash
      stage.style.width = `${EXPORT_WIDTH}px`;
      stage.style.pointerEvents = "none";
      stage.style.zIndex = "-1";
      clone.style.width = `${EXPORT_WIDTH}px`;
      clone.style.maxWidth = `${EXPORT_WIDTH}px`;
      stage.appendChild(clone);
      document.body.appendChild(stage);

      try {
        const options = {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          width: EXPORT_WIDTH,
          canvasWidth: EXPORT_WIDTH,
          style: { transform: "none" },
        };

        // Web Share API with file (mobile-native share sheet) when available.
        const hasFileShare =
          typeof navigator !== "undefined" &&
          "share" in navigator &&
          typeof navigator.canShare === "function";

        if (hasFileShare) {
          const blob = await toBlob(clone, options);
          if (blob) {
            const file = new File([blob], filename, { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: "My Palate taste profile",
              });
              setState("done");
              setTimeout(() => setState("idle"), 2000);
              return;
            }
          }
        }

        const dataUrl = await toPng(clone, options);
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
        setState("done");
        setTimeout(() => setState("idle"), 2000);
      } finally {
        document.body.removeChild(stage);
      }
    } catch (err) {
      // AbortError means the user cancelled the share sheet — not a real error.
      if (err instanceof Error && err.name === "AbortError") {
        setState("idle");
        return;
      }
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
