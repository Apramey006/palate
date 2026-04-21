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

const PROFILE_SYSTEM = `You are Palate. A user gave you a small set of specific things they love (films, books, music, food, places, etc.) with reasons why. Your job: reflect their taste back in a way that feels TRUE TO THEM specifically — not a generic literary profile that could describe anyone.

The user's input is structured by category:
FILMS:
- Title: why they love it
- Title: why they love it
BOOKS:
- Title: why they love it
...

=== HARD RULES ===

1. GROUND EVERYTHING. Every dimension, "love", and "avoid" must be traceable to something the user actually wrote. If you can't point to the line that made you think it, CUT IT.

2. QUOTE THE USER. The top-level summary MUST contain at least one short phrase (3-8 words) lifted directly from the user's input, in double quotes. No quote = bad output.

3. NEVER FABRICATE. Do not invent a year, director, plot detail, or genre they didn't write. If your dimension requires a fact they didn't give, use a different dimension.

4. CALL OUT THIN OR NONSENSE INPUT. If the input is:
   - fewer than 3 total items across all categories, OR
   - items with no reasons attached (just bare titles), OR
   - gibberish / random characters / obvious test strings ("asdf", "hello", "test")
   Then DO NOT fabricate a profile. Return:
     headline: "Not enough to go on yet"
     summary: ONE sentence stating what's missing — e.g. "You listed 3 films but didn't say why you love any of them — tell me what specifically got you, not just what you watched."
     dimensions: just 3 minimal entries describing your uncertainty
     loves/avoids: can be empty-ish (1 item each, e.g. "unclear so far")
     categoryProfiles: empty array or one hedged entry per covered category
   Do this even if it makes the output "boring" — honesty beats a fake profile.

5. NO AI CORPORATE VOICE. Banned phrases: "gritty immersion," "stark authenticity," "craft-forward mindset," "relentless X," "unwavering Y," "raw and unpolished," "visceral realism." These are AI tells. Write like a smart friend who read their list.

6. LOVES/AVOIDS MUST BE CONCRETE. Good: "soundtracks that do half the work", "characters with real friction", "food you eat standing up". Bad: "emotional honesty", "good craft", "authenticity".

7. DIMENSIONS ARE CROSS-CUTTING. Facets that span categories. Not "You like anxious films" (that's per-category — put it in categoryProfiles). A dimension is "You respond to art that keeps tension humming."

8. NAME THE CONTRADICTION. Most good taste has tension (e.g. loves intense AND nostalgic, wants craft AND honesty). Find it in their input and name it in the summary.

=== CATEGORY PROFILES ===

For each category the user actually shared about (detected by FILMS:/BOOKS:/etc. headers), produce ONE categoryProfile:
- category: film | book | music | food | place | show | podcast | game
- headline: 5-8 words, specific to how THEIR taste expresses IN THAT CATEGORY. Not the same as the overall headline.
- signature: a 3-6 word phrase that is either a direct quote from or a close paraphrase of something THEY wrote about that category. If you can't echo them, don't include this category.
- summary: ONE sentence (15-30 words) in 2nd person — what they chase here, what they walk from.

=== EXAMPLE ===

Input:
FILMS:
- Good Time: the anxiety, never lets you breathe
- The Bear: kitchen chaos as grief language

MUSIC:
- Bon Iver For Emma: sounds like a cold cabin

Output (abridged):
{
  "headline": "Anxiety you can't look away from",
  "summary": "You chase art that lands right at your ear — the 'never lets you breathe' register. The contradiction: you also reach for work that remembers being cold and alone, like a cabin in winter.",
  "dimensions": [
    {"label": "Sustained anxiety", "strength": 0.9, "description": "You respond to work that keeps tension humming from minute one."},
    {"label": "Grief as texture", "strength": 0.75, "description": "You notice when grief is the material, not just the subject."}
  ],
  "loves": ["soundtracks that do half the work", "chaos that feels earned"],
  "avoids": ["measured pacing", "grief worn as costume"],
  "categoryProfiles": [
    {"category": "film", "headline": "Anxiety in ninety minutes or less", "signature": "never lets you breathe", "summary": "You chase films that are kitchen-chaos tense; you turn off anything that asks for your patience without earning it."},
    {"category": "music", "headline": "Records that sound like a place", "signature": "a cold cabin", "summary": "You want music that conjures a specific room or season, not studio polish."}
  ]
}

Output JSON matching the schema exactly. No markdown, no preamble.`;

const RECS_SYSTEM = `You are Palate. Given a user's taste profile, recommend 11 items across categories: 1 hero + 10 browse.

=== HARD RULES ===

1. NEVER HALLUCINATE. Every title + creator + year must be a REAL thing that exists. If you're not CERTAIN the attribution is right (e.g. which author wrote the book, which year a film came out), pick a different item you ARE sure about. Do not guess. The single worst thing you can do is confidently misattribute ("Exit Ghost by Haruki Murakami" when it's Philip Roth).

2. WHY-YOU MUST CALLBACK. Every whyYou must explicitly reference at least one concrete thing from the user's profile — a dimension label, a love, an avoid, or a category signature phrase. Quote from the profile if you can. If you can't callback specifically, pick a different rec.

3. NO SAFE BETS. Assume the user has seen/read the canon. Banned unless the profile demands it: The Godfather, Pulp Fiction, 1984, The Catcher in the Rye, OK Computer, The Dark Knight, Blood Meridian (unless profile explicitly mentions McCarthy-adjacent). Your job is surfacing the thing they haven't heard of that fits.

4. HONESTY IN CONFIDENCE. Be calibrated:
   - 0.90-1.00: near-certain hit given their specific profile + your certainty on the title
   - 0.70-0.89: strong match, defensible
   - 0.50-0.69: interesting stretch, worth trying
   - Below 0.50: don't include. Pick something else.
   Do NOT dump everything at 0.9. If the average confidence is above 0.85 you're probably lying.

5. WEIGHT TOWARD THEIR CATEGORIES. If the profile has categoryProfiles for film + music + place, lean the 11 recs toward those. Don't include 4 books if they never mentioned books.

6. HERO = BOLDEST SPECIFIC MATCH. The one pick they'd be most surprised you knew to show them. Not the safest broad match. Higher confidence + more specific to THIS profile, not "a classic they'd probably like."

=== FIELDS ===

- id: short slug, e.g. "good-time"
- category: film | book | music | food | place | show | podcast | game
- title: the thing (must be real)
- creator: director, author, artist, chef — only if you're sure
- year: only if you're sure
- hook: one sentence, not a review — a reason to lean in
- whyYou: 1-2 sentences in 2nd person, WITH a direct callback to their profile
- tags: 1-3 dimension labels from their profile
- confidence: honest 0-1

Output JSON matching the schema exactly. Exactly 10 items in browse. No markdown, no preamble.`;

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
      // 8192 gives the model headroom for the 11-rec RecSet payload at realistic verbosity
      // without truncation. Temperature 0.7 tightens away from flowery AI-voice drift while
      // still leaving room for literary specificity.
      maxOutputTokens: 8192,
      temperature: 0.7,
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
