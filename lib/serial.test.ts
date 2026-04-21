import { describe, expect, it } from "vitest";
import { profileSerial } from "./serial";
import type { TasteProfile } from "./types";

function base(headline: string, summary: string): TasteProfile {
  return {
    headline,
    summary,
    dimensions: [],
    loves: [],
    avoids: [],
    sourceText: "",
  };
}

describe("profileSerial", () => {
  it("is stable for the same profile", () => {
    const p = base("headline A", "summary A");
    expect(profileSerial(p)).toBe(profileSerial(p));
  });

  it("differs for different profiles (spot check)", () => {
    const a = profileSerial(base("headline A", "summary A"));
    const b = profileSerial(base("headline B", "summary B"));
    expect(a).not.toBe(b);
  });

  it("returns a 6-character zero-padded numeric string", () => {
    const s = profileSerial(base("x", "y"));
    expect(s).toMatch(/^\d{6}$/);
  });

  it("ignores fields other than headline + summary", () => {
    const a = base("h", "s");
    const b: TasteProfile = {
      ...a,
      dimensions: [{ label: "foo", strength: 0.5, description: "bar" }],
      loves: ["tightly paced"],
    };
    expect(profileSerial(a)).toBe(profileSerial(b));
  });
});
