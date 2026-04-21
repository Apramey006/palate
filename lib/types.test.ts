import { describe, expect, it } from "vitest";
import {
  ProfileFromLLMSchema,
  RecSetFromLLMSchema,
  TasteProfileSchema,
  RecommendationSchema,
} from "./types";

const validProfileFromLLM = {
  headline: "Anxious intensity with a soft spot for nostalgia",
  summary: "You sit in uncomfortable rooms but come back to work that remembers being young.",
  dimensions: [
    { label: "Anxious intensity", strength: 0.9, description: "Tension under the surface." },
    { label: "Craft-forward", strength: 0.75, description: "You notice care." },
    { label: "Nostalgic warmth", strength: 0.6, description: "Pull toward growing-up work." },
  ],
  loves: ["tight pacing", "unreliable narrators"],
  avoids: ["sprawling runtimes"],
};

const validRec = {
  id: "good-time",
  category: "film" as const,
  title: "Good Time",
  creator: "Safdie Brothers",
  year: 2017,
  hook: "A propulsive NYC night that never lets you exhale.",
  whyYou: "You wanted anxiety you can't look away from — here it is.",
  tags: ["Anxious intensity", "Craft-forward"],
  confidence: 0.92,
};

describe("Zod schemas", () => {
  it("accepts a valid LLM profile", () => {
    expect(ProfileFromLLMSchema.safeParse(validProfileFromLLM).success).toBe(true);
  });

  it("rejects a profile with too few dimensions", () => {
    const bad = { ...validProfileFromLLM, dimensions: [validProfileFromLLM.dimensions[0]] };
    expect(ProfileFromLLMSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects strength outside [0, 1]", () => {
    const bad = {
      ...validProfileFromLLM,
      dimensions: [
        { label: "overshoot", strength: 1.4, description: "nope" },
        ...validProfileFromLLM.dimensions.slice(1),
      ],
    };
    expect(ProfileFromLLMSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a valid Recommendation", () => {
    expect(RecommendationSchema.safeParse(validRec).success).toBe(true);
  });

  it("rejects a Recommendation with unknown category", () => {
    const bad = { ...validRec, category: "wine" };
    expect(RecommendationSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a RecSet with hero + 10 browse", () => {
    const browse = Array.from({ length: 10 }, (_, i) => ({ ...validRec, id: `r${i}` }));
    expect(RecSetFromLLMSchema.safeParse({ hero: validRec, browse }).success).toBe(true);
  });

  it("rejects a RecSet with too few browse items", () => {
    const browse = Array.from({ length: 3 }, (_, i) => ({ ...validRec, id: `r${i}` }));
    expect(RecSetFromLLMSchema.safeParse({ hero: validRec, browse }).success).toBe(false);
  });

  it("accepts a full TasteProfile (with sourceText)", () => {
    const withSource = { ...validProfileFromLLM, sourceText: "i love good time" };
    expect(TasteProfileSchema.safeParse(withSource).success).toBe(true);
  });
});
