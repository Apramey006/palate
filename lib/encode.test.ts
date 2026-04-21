import { describe, expect, it } from "vitest";
import { encodeProfile, decodeProfile } from "./encode";
import type { TasteProfile } from "./types";

const sample: TasteProfile = {
  headline: "Anxious intensity with a soft spot for nostalgia",
  summary: "You sit in uncomfortable emotional rooms but come back to work that remembers being young.",
  dimensions: [
    { label: "Anxious intensity", strength: 0.9, description: "Tension under the surface." },
    { label: "Craft-forward", strength: 0.75, description: "You notice when something is made with care." },
    { label: "Nostalgic warmth", strength: 0.6, description: "Pull toward work about growing up." },
  ],
  loves: ["tight pacing", "unreliable narrators"],
  avoids: ["sprawling runtimes"],
  sourceText: "i love good time and bon iver. i hate boring movies. tokyo is my city.",
};

describe("encodeProfile / decodeProfile", () => {
  it("round-trips a profile exactly", () => {
    const encoded = encodeProfile(sample);
    const decoded = decodeProfile(encoded);
    expect(decoded).toEqual(sample);
  });

  it("produces a URL-safe string (no +, /, =)", () => {
    const encoded = encodeProfile(sample);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null on garbage input", () => {
    expect(decodeProfile("not-a-real-profile-id")).toBeNull();
    expect(decodeProfile("")).toBeNull();
    expect(decodeProfile("!!!")).toBeNull();
  });

  it("handles unicode in the source text", () => {
    const withUnicode: TasteProfile = {
      ...sample,
      sourceText: "love café culture · 東京 · « slow » films — café",
    };
    const encoded = encodeProfile(withUnicode);
    expect(decodeProfile(encoded)).toEqual(withUnicode);
  });
});
