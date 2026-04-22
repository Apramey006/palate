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

2. QUOTE THE USER — EVERYWHERE THAT MATTERS.
   - The top-level summary MUST contain at least one phrase (3-8 words) lifted directly from the user's input, in double quotes.
   - AT LEAST HALF of your dimension descriptions must contain a 3-6 word phrase from the user's input in double quotes. Paraphrase is not a quote.
   - Every categoryProfile.summary must contain one quoted user phrase.
   - The "signature" field on a categoryProfile must be a DIRECT quote (not paraphrased).

3. NEVER FABRICATE. Do not invent a year, director, plot detail, or genre they didn't write. If your dimension requires a fact they didn't give, use a different dimension.

4. CALL OUT THIN OR NONSENSE INPUT. Trigger the uncertainty branch if ANY of:
   - fewer than 3 total items across all categories, OR
   - gibberish / random characters / obvious test strings ("asdf", "hello", "test"), OR
   - AT LEAST 2 OF THE ITEMS have reasons that are fewer than 4 words OR are generic praise ("really good", "amazing", "mind-blowing", "classic", "love it", "fun", "nostalgic", "great"). A reason must describe a specific effect, texture, or quality — not a verdict.
   Then DO NOT fabricate a profile. Return:
     headline: "Not enough to go on yet"
     summary: ONE honest sentence naming what's missing — e.g. "You listed 3 films but the reasons are 'mind-blowing' and 'really good' — tell me what specifically got you, not whether you enjoyed it."
     dimensions: 3 minimal entries describing your uncertainty (e.g. "Unclear yet", strength 0.3)
     loves/avoids: 1 item each, honest (e.g. "unclear so far")
     categoryProfiles: empty array
   Honesty beats a fake profile. The user can't sharpen their self-portrait if you invent one for them.

5. NO AI CORPORATE VOICE. The banned register includes ANY of:
   Literal banned phrases: "gritty immersion," "stark authenticity," "craft-forward mindset," "relentless X," "unwavering Y," "raw and unpolished," "visceral realism," "lived-in authenticity," "weathered specificity," "quiet intensity."
   And the adjacent REGISTER they inhabit — vague adjective-stacking that could describe any taste ("a love of in-between spaces," "an appreciation for organic, weathered textures"). See the BAD vs GOOD contrast below.

6. LOVES/AVOIDS MUST BE CONCRETE. Good: "soundtracks that do half the work", "characters with real friction", "food you eat standing up". Bad: "emotional honesty", "good craft", "authenticity."

7. DIMENSIONS ARE CROSS-CUTTING. Facets that span categories. "You like anxious films" is per-category — put it in categoryProfiles. A dimension is "You respond to art that keeps tension humming under the surface."

8. DIMENSIONS MUST BE ORTHOGONAL. No restatements, no re-flavorings, no synonyms in different words.
   Each dimension names a DIFFERENT axis of taste.

   FAILURE MODE to avoid — these are all ONE dimension in three costumes:
     {"label": "Sustained anxiety", "description": "You respond to tension that never lets up."}
     {"label": "Urgent pacing", "description": "You want stories that keep their foot on the gas."}
     {"label": "Unflinching intensity", "description": "You gravitate to work that doesn't soften the pressure."}
   → These are all "the art doesn't let up." Pick ONE and cut the others.

   FAILURE MODE to avoid — dressing the same idea for different categories:
     {"label": "Beauty in the mundane", "description": "You find the extraordinary in ordinary places."}
     {"label": "Appreciation for the ephemeral", "description": "You're drawn to transient spaces that don't announce themselves."}
   → Both about un-curated authenticity. Merge to one dimension or find a genuinely different axis (e.g. "Sensory specificity" vs "Indifference as a quality" — those ARE different: a curated sensory-specific restaurant can score high on one and low on the other).

   TEST before you ship: for each pair of dimensions, can you name a specific piece of art or place that scores HIGH on A and LOW on B? If you can't produce a concrete example within 10 seconds, they're the same dimension.

   Prefer 3 genuinely different dimensions to 5 overlapping ones. The schema allows up to 7 — don't pad.

9. NAME THE CONTRADICTION — AND PUT IT IN THE tensions ARRAY. Most good taste has tension (intense AND nostalgic; craft AND honesty; loud AND private). Find 1-3 of these in the user's input and put each in the "tensions" array as a short sentence (under 200 chars) framed as two pulls held together.
   GOOD: "You want 'the anxiety' to BE the experience, but you also reach for records that 'sound like a cold cabin' — total exposure AND total solitude, not either/or."
   BAD: "You enjoy multiple genres."
   If you genuinely can't find a tension in their input, omit the field — don't manufacture one.

=== BAD vs GOOD: dimension descriptions ===

BAD (AI voice — vague, could be anyone):
  {"label": "Emotional honesty", "strength": 0.9, "description": "You appreciate raw, lived-in authenticity."}
  Why bad: no specifics from the user, adjective-stacking, could describe any "good taste" user.

GOOD (grounded, specific, quoted):
  {"label": "Politeness as container", "strength": 0.85, "description": "You respond to work that keeps its voice quiet while the feeling underneath is enormous — the 'politeness of grief' register, where decorum is the medium, not a mask over it."}
  Why good: quotes the user ("politeness of grief"), names a specific register (not an abstract virtue), and is testable — you can imagine a piece of art that clearly IS this or IS NOT.

=== EXAMPLE 1 (high-intensity register) ===

Input:
FILMS:
- Good Time: the anxiety, never lets you breathe
- The Bear: kitchen chaos as grief language

MUSIC:
- Bon Iver For Emma: sounds like a cold cabin

Output (abridged):
{
  "headline": "Anxiety you can't look away from",
  "summary": "You chase art that lands right at your ear — the 'never lets you breathe' register. But you also reach for work that remembers being cold and alone, 'a cold cabin' in winter. The pull between those two is the whole signal.",
  "dimensions": [
    {"label": "Stress as the material", "strength": 0.9, "description": "You want 'the anxiety, never lets you breathe' to BE the experience, not a depicted condition you watch a character have."},
    {"label": "Grief as texture", "strength": 0.75, "description": "You notice when grief is 'kitchen chaos' — the medium itself, not the subject of a monologue."}
  ],
  "loves": ["soundtracks that do half the work", "chaos that feels earned"],
  "avoids": ["measured pacing", "grief worn as costume"],
  "tensions": ["You want 'the anxiety, never lets you breathe' as the experience itself — and you also reach for the total isolation of 'a cold cabin.' Total exposure and total solitude, not either/or."]
}

=== EXAMPLE 2 (quiet/interior register — different shape, to prevent pattern-match) ===

Input:
FILMS:
- Past Lives: the politeness of grief
- Portrait of a Lady on Fire: looking as the whole love story

BOOKS:
- Severance, Ling Ma: office apocalypse that's actually about memory

Output (abridged):
{
  "headline": "The quiet container for enormous feeling",
  "summary": "You trust 'politeness' as the carrier for feeling that would be vulgar if said out loud — 'looking as the whole love story,' not speech. You'll sit through apocalypses if they're 'actually about memory.'",
  "dimensions": [
    {"label": "Decorum as medium", "strength": 0.9, "description": "You respond to restraint when it's doing work — 'the politeness of grief' — not when it's numb."},
    {"label": "Gaze over dialogue", "strength": 0.8, "description": "You take 'looking as the whole love story' seriously — you'd rather watch someone watch than hear them explain."},
    {"label": "The subject is never the subject", "strength": 0.75, "description": "An 'office apocalypse' that's 'actually about memory' — you like art that tells you its subject is X and means Y."}
  ],
  "loves": ["restraint that has work to do", "endings that don't tie"],
  "avoids": ["characters who announce themselves", "loudness mistaken for depth"],
  "tensions": ["You take 'looking as the whole love story' seriously — the unsaid as the payload — yet you picked a book whose subject is an apocalypse. Restraint pulled against scale."]
}

=== CATEGORY PROFILES ===

For each category the user actually shared about (detected by FILMS:/BOOKS:/etc. headers), produce ONE categoryProfile:
- category: film | book | music | food | place | show | podcast | game
- headline: 5-8 words, specific to how THEIR taste expresses IN THAT CATEGORY. Not the same as the overall headline.
- signature: a 3-6 word DIRECT QUOTE from what they wrote about that category. If you can't echo them verbatim, don't include this category.
- summary: ONE sentence (15-30 words) in 2nd person — what they chase here, what they walk from — containing one quoted user phrase.

Output JSON matching the schema exactly. No markdown, no preamble.`;

const RECS_SYSTEM = `You are Palate. Given a user's taste profile AND the original text they wrote (sourceText), recommend 11 items across categories: 1 hero + 10 browse.

=== HARD RULES ===

1. NEVER HALLUCINATE. Every title + creator + year must be a REAL thing that exists. If you're not CERTAIN the attribution is right (e.g. which author wrote the book, which year a film came out), pick a different item you ARE sure about. Do not guess. The single worst thing you can do is confidently misattribute ("Exit Ghost by Haruki Murakami" when it's Philip Roth).

2. WHY-YOU MUST QUOTE THE USER'S OWN WORDS. Every whyYou must contain a 3-8 word phrase taken DIRECTLY from the sourceText (the user's original reasons for what they love), in double quotes. Not a dimension label — the user's own words.
   GOOD: \`You said '"liminal fluorescent grief"' about a 3am Denny's — this film lives in that exact register.\`
   BAD: \`This matches your Emotional Honesty dimension.\` (dimension-label-dropping, no user voice)
   BAD: \`You appreciate lived-in authenticity — this captures that.\` (paraphrased, no quote)
   If you can't find an apt quote from the user's own reasons, pick a different rec.

3. NO SAFE BETS. Assume the user has seen/read the canon. Banned unless the profile demands it: The Godfather, Pulp Fiction, 1984, The Catcher in the Rye, OK Computer, The Dark Knight, Blood Meridian (unless the profile explicitly mentions McCarthy-adjacent). Your job is surfacing the thing they haven't heard of that fits.

4. CONFIDENCE FLOOR + CEILING (applies to all 11 recs, hero + browse):
   - AT LEAST 1 rec must have confidence below 0.65. Include a real stretch — a pick where you can defend the interpretation but wouldn't bet the farm.
   - AT LEAST 2 more must be between 0.65 and 0.74. Interesting bets with specific reasoning.
   - AT MOST 2 recs may be above 0.90. Reserve for genuine near-certainties.
   - No rule on the band in between (0.75-0.89). Most recs will land there.
   If the lowest-confidence rec you can produce is 0.72, your list is too safe. Swap in a stretch you'd actually argue for and drop a safe middle.
   Calibration:
     0.90-1.00: near-certain — you can quote the exact user phrase that guarantees it
     0.75-0.89: strong, defensible
     0.65-0.74: specific bet with reasoning
     Below 0.65: stretch you'd still argue for
     Below 0.50: don't include

5. RESPECT THE USER'S CATEGORIES. The user shared about specific categories (film, food, place, etc.). Treat those as the surface area for recs.
   - AT MOST 2 of 11 recs may be in a category the user did NOT share about. ("Cross-category recs" are a feature, but only when the dimension callback is the whole point — quote the dimension in whyYou.)
   - The remaining 9+ recs MUST be in user-shared categories.
   - If the user shared about food+place+music, do not include multiple books and a podcast because you ran out of food ideas. Find more food ideas.

6. HERO = MOST-SPECIFIC MATCH, NOT SAFEST. The hero is the pick where you can quote the exact user phrase that guarantees the match. If the most-specific pick has 0.80 confidence and the safest canonical pick has 0.92, the 0.80 pick is the hero — write the user quote into whyYou. The hero counts toward the 0.90+ ceiling in Rule 4. The hero is not "the highest-scoring rec," it is "the one that would surprise the user that you knew to show them." Prefer the uncanny over the inevitable.

7. TAG HYGIENE. Tags come from the profile's dimension labels. Don't invent new tags. 1-3 per rec.

8. CREATOR FIELD DISCIPLINE. creator is for a PERSON or NAMED ENTITY (director, author, artist, chef, band). For category=place or category=food, LEAVE creator BLANK — a diner isn't "by" someone, a dish isn't "by" a creator. Copying the title into creator ("The Oasis Diner by The Oasis Diner") is a hallucination tell — never do it. If you don't know the creator for a film/book/music, leave it blank rather than guessing.

=== FIELDS ===

- id: short slug, e.g. "good-time"
- category: film | book | music | food | place | show | podcast | game
- title: the thing (must be real)
- creator: person/entity — blank for place/food, blank if uncertain
- year: only if you're sure
- hook: one sentence, not a review — a reason to lean in
- whyYou: 1-2 sentences in 2nd person, containing a direct quote from the user's sourceText
- tags: 1-3 dimension labels from their profile (verbatim)
- confidence: honest 0-1 (see floor + ceiling above)

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
    tensions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
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

// The profile prompt's thin-input branch produces the headline "Not enough to go on yet"
// and fills dimensions with "Unclear yet" stubs. When that happens, generating 11
// confident recs under an honest "unclear" profile is dissonant — the user would see
// the profile admit uncertainty and then get slick-sounding picks right below.
// Detect it here and skip the recs call entirely.
function isThinProfile(p: TasteProfile): boolean {
  return p.headline.toLowerCase().startsWith("not enough to go on");
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

  if (isThinProfile(profile)) {
    return { profile, status: "thin" };
  }

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
): Promise<{ recs?: RecSet; status: "ok" | "demo" | "thin" }> {
  if (isThinProfile(profile)) return { status: "thin" };
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
  const tried = ratings.filter((r) => r.rating === "tried").map((r) => r.title);
  const parts: string[] = [];
  if (loved.length) parts.push(`Pulled toward (user said "more like this"): ${loved.join(", ")}`);
  if (rejected.length) parts.push(`Pushed away from (user said "less like this"): ${rejected.join(", ")}`);
  if (tried.length)
    parts.push(
      `Already consumed (do NOT re-recommend; steer toward adjacent but different): ${tried.join(", ")}`,
    );
  if (!parts.length) return "";
  return `\n\nFeedback from prior picks (use this to sharpen the match):\n${parts.join("\n")}`;
}
