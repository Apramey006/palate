import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";
import type { GenerateResponse, RecSet, TasteProfile, StoredRating } from "./types";
import { ProfileFromLLMSchema, RecSetFromLLMSchema } from "./types";
import { mockResponse } from "./mock";

// gemini-2.5-flash-lite is non-thinking (no internal-reasoning tokens) which makes it
// fast and reliable for structured JSON output. gemini-2.5-flash also works on this
// project's free tier but its default thinking budget can burn output tokens before
// producing the full 11-rec RecSet payload — was timing out / returning empty text.
// gemini-2.0-flash returned "limit: 0" on this specific AI Studio project — skip it.
const MODEL = "gemini-2.5-flash-lite";

// ---------------------------------------------------------------------------
// Prompts — treat edits like code edits. Small, reviewed, with a stated reason.
// Gemini tends to be eager-to-please and overly polished; the "mirror not fan"
// guidance here earns its keep against that default voice.
// ---------------------------------------------------------------------------

const PROFILE_SYSTEM = `You are Palate, a taste-profiling assistant. A user describes things they love (and hate) across movies, books, music, food, places, shows — anything. Your job is to extract a *portrait of their taste*, not a list of items.

Output a JSON object matching the response schema exactly.

Guidance:
- headline: 5-9 words. A memorable phrase capturing their OVERALL taste across categories. NOT a compliment, NOT generic. Specific and slightly unexpected. Example good: "Anxious intensity with a soft spot for nostalgia". Example bad: "Thoughtful and nuanced taste".
- summary: 2-3 sentences, written TO them in second person. Name tensions in their taste (most good taste has a contradiction).
- dimensions: 4-6 axes. Each is a CROSS-CUTTING facet of their taste (spans categories) — NOT a genre they like. Label is 2-4 words; description is ONE sentence, second person.
- loves: 3-6 concrete qualities/textures they respond to. Short phrases, not full sentences.
- avoids: 3-6 concrete qualities they reject. Short phrases.
- categoryProfiles: ONE entry for EACH category the user actually shared about (detected by the FILMS:/BOOKS:/MUSIC:/etc. headers in their input). Do not invent categories they didn't cover. Each entry:
    - category: the category key (film | book | music | food | place | show | podcast | game)
    - headline: 5-8 words. A portrait of how THEIR taste expresses IN THIS CATEGORY. e.g. "Anxiety in 90 minutes or less" (for film). Different from the overall headline.
    - signature: a 3-6 word phrase that quotes/paraphrases the user's OWN language about this category. e.g. "a cold cabin in winter" (if they said that about Bon Iver).
    - summary: ONE sentence, 15-30 words, second person. What they chase in this category, and what they avoid.

Rules:
- Do NOT list example titles they mentioned in the top-level summary/dimensions — extract the underlying taste. (categoryProfiles.signature CAN echo their own phrases.)
- Be SPECIFIC. "You like emotional honesty" is lazy. "You'd rather something land awkwardly than land safely" is better.
- Dimensions must be CROSS-CUTTING — do NOT mirror the category structure back ("You like anxious films, nostalgic music"). Synthesize across. The per-category portraits live in categoryProfiles.
- If they gave thin input, REFLECT that — say "this is a rough sketch" in the summary and keep dimensions hedged.
- Never flatter. Never editorialize positively ("great taste!"). You are a mirror, not a fan.`;

const RECS_SYSTEM = `You are Palate. You are given a taste profile and must recommend 11 cross-category items this person will likely love. Pick the ONE BEST as the hero and exactly 10 more for a browse feed.

Categories to spread across: film, book, music, food, place, show, podcast, game. You do NOT need to use all — pick whichever best fit the profile. Aim for 4-6 categories represented.

Each Recommendation:
- id: short slug, e.g. "good-time"
- category: one of film | book | music | food | place | show | podcast | game
- title: the thing
- creator (optional): director, author, artist, chef — if applicable
- year (optional)
- hook: one sentence. Not a review. A reason to lean in.
- whyYou: 1-2 sentences written TO the user in second person, referencing THEIR profile. Be specific. No generic "you'll love this." Make a callback to the user's actual words or metaphors where possible.
- tags: 1-3 dimensions from their profile that this hits
- confidence: 0-1. Be honest; don't max out everything.

Rules:
- Do NOT recommend items they mentioned. Read the source text for hints of what they already know.
- The user is likely well-read/watched. Assume they've seen the canonical picks in categories they love. EARN your slot. Aim 30/70 well-known/obscure — you are not a "top 10 of all time" list.
- No safe bets. No "The Godfather" or "1984" unless the profile deeply demands it.
- The hero should be the BOLDEST specific match, not the safest broad one.
- whyYou must reference the profile specifically. If you can't say why THIS person would like it, pick something else.`;

// ---------------------------------------------------------------------------
// Gemini JSON schemas — Google's structured-output format. Keeping these aligned
// with the zod schemas in lib/types.ts; zod is still the source of truth on the
// response, both as a defense-in-depth check and because Gemini occasionally
// returns extra/missing fields at the edges.
// ---------------------------------------------------------------------------

const PROFILE_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    dimensions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          strength: { type: SchemaType.NUMBER },
          description: { type: SchemaType.STRING },
        },
        required: ["label", "strength", "description"],
      },
    },
    loves: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    avoids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    categoryProfiles: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["film", "book", "music", "food", "place", "show", "podcast", "game"],
          },
          headline: { type: SchemaType.STRING },
          signature: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
        },
        required: ["category", "headline", "signature", "summary"],
      },
    },
  },
  required: ["headline", "summary", "dimensions", "loves", "avoids"],
};

const RECOMMENDATION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    category: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["film", "book", "music", "food", "place", "show", "podcast", "game"],
    },
    title: { type: SchemaType.STRING },
    creator: { type: SchemaType.STRING },
    year: { type: SchemaType.INTEGER },
    hook: { type: SchemaType.STRING },
    whyYou: { type: SchemaType.STRING },
    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ["id", "category", "title", "hook", "whyYou", "tags", "confidence"],
};

const RECSET_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    hero: RECOMMENDATION_SCHEMA,
    browse: { type: SchemaType.ARRAY, items: RECOMMENDATION_SCHEMA },
  },
  required: ["hero", "browse"],
};

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

/**
 * Call Gemini with JSON-schema-enforced structured output, then zod-validate the
 * result as a defense-in-depth check. On zod failure send the parse error back for
 * one correction turn before surfacing as an error.
 */
async function callAndValidate<T>(
  client: GoogleGenerativeAI,
  system: string,
  userText: string,
  responseSchema: Schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodSchema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: any } },
  label: string,
): Promise<T> {
  const model = client.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      maxOutputTokens: 4096,
      temperature: 0.9,
    },
  });

  const first = await model.generateContent(userText);
  const firstText = first.response.text();
  const firstParsed = tryParse(firstText);
  if (firstParsed !== null) {
    const validated = zodSchema.safeParse(firstParsed);
    if (validated.success) return validated.data;

    // Correction turn: feed the parse error back.
    const retry = await model.generateContent(
      `Your previous response was:\n${firstText}\n\nIt failed schema validation for ${label}. Error: ${validated.error.message}\n\nReturn VALID JSON that matches the schema exactly.`,
    );
    const retryText = retry.response.text();
    const retryParsed = tryParse(retryText);
    if (retryParsed === null) {
      throw new Error(`${label}: retry also returned non-JSON`);
    }
    const retryValidated = zodSchema.safeParse(retryParsed);
    if (!retryValidated.success) {
      throw new Error(`${label}: ${retryValidated.error.message}`);
    }
    return retryValidated.data;
  }

  throw new Error(`${label}: Gemini returned non-JSON even with structured output`);
}

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Generate a fresh taste profile and rec set from a free-text input.
 *
 * Three terminal states:
 *   - status "demo": no GOOGLE_API_KEY configured — returns the mock response so the UI
 *     stays fully functional for review and screenshots without spending quota.
 *   - status "ok":   a real call that parsed cleanly against both the Gemini JSON schema
 *     and the defense-in-depth zod schema.
 *   - throws:        the call failed (network, API, or validation). The route handler
 *     surfaces this to the user instead of quietly lying with canned data.
 */
export async function generate(sourceText: string): Promise<GenerateResponse> {
  const client = getClient();
  if (!client) return { ...mockResponse(sourceText), status: "demo" };

  const profileData = await callAndValidate(
    client,
    PROFILE_SYSTEM,
    sourceText,
    PROFILE_RESPONSE_SCHEMA,
    ProfileFromLLMSchema,
    "TasteProfile",
  );
  const profile: TasteProfile = { ...profileData, sourceText };

  const recsPrompt = `Taste profile:\n${JSON.stringify(profile, null, 2)}\n\nOriginal source text from user:\n"""${sourceText}"""`;
  const recsData = await callAndValidate(
    client,
    RECS_SYSTEM,
    recsPrompt,
    RECSET_RESPONSE_SCHEMA,
    RecSetFromLLMSchema,
    "RecSet",
  );

  return {
    profile,
    recs: {
      hero: recsData.hero,
      browse: recsData.browse,
      generatedAt: new Date().toISOString(),
    },
    status: "ok",
  };
}

export async function regenerateRecs(
  profile: TasteProfile,
  avoidTitles: string[] = [],
  ratings: StoredRating[] = [],
): Promise<{ recs: RecSet; status: "ok" | "demo" }> {
  const client = getClient();
  if (!client) return { recs: mockResponse(profile.sourceText).recs, status: "demo" };

  const avoid = avoidTitles.length
    ? `\n\nAlready shown (do NOT repeat): ${avoidTitles.join(", ")}`
    : "";

  const ratingsBlock = buildRatingsBlock(ratings);

  const prompt = `Taste profile:\n${JSON.stringify(profile, null, 2)}\n\nOriginal source text:\n"""${profile.sourceText}"""${ratingsBlock}${avoid}`;

  const recsData = await callAndValidate(
    client,
    RECS_SYSTEM,
    prompt,
    RECSET_RESPONSE_SCHEMA,
    RecSetFromLLMSchema,
    "RecSet",
  );

  return {
    recs: {
      hero: recsData.hero,
      browse: recsData.browse,
      generatedAt: new Date().toISOString(),
    },
    status: "ok",
  };
}

function buildRatingsBlock(ratings: StoredRating[]): string {
  if (ratings.length === 0) return "";
  const loved = ratings.filter((r) => r.rating === "love").map((r) => r.title);
  const rejected = ratings.filter((r) => r.rating === "nope").map((r) => r.title);
  const parts: string[] = [];
  if (loved.length) parts.push(`Previously loved: ${loved.join(", ")}`);
  if (rejected.length) parts.push(`Previously rejected: ${rejected.join(", ")}`);
  if (!parts.length) return "";
  return `\n\nFeedback from prior picks (use this to sharpen the match):\n${parts.join("\n")}`;
}
