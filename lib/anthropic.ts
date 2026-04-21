import Anthropic from "@anthropic-ai/sdk";
import type { GenerateResponse, Recommendation, RecSet, TasteProfile } from "./types";
import { mockResponse } from "./mock";

const MODEL = "claude-sonnet-4-5-20250929";

const PROFILE_SYSTEM = `You are Palate, a taste-profiling assistant. A user describes things they love (and hate) across movies, books, music, food, places, shows — anything. Your job is to extract a *portrait of their taste*, not a list of items.

Output JSON ONLY, matching this schema:
{
  "headline": string,   // 5-9 words; a memorable phrase capturing their taste. NOT a compliment, NOT generic. Specific and slightly unexpected.
  "summary": string,    // 2-3 sentences. Written TO them in second person. Name tensions in their taste (most good taste has a contradiction).
  "dimensions": [       // 4-6 axes. Each is a facet of their taste — not a genre they like.
    { "label": string, "strength": number (0-1), "description": string (one sentence, second person) }
  ],
  "loves": string[],    // 3-6 concrete qualities/textures they respond to. Short phrases, not full sentences.
  "avoids": string[]    // 3-6 concrete qualities they reject. Short phrases.
}

Rules:
- Do not list example titles they mentioned — extract the underlying taste.
- Be specific. "You like emotional honesty" is lazy. "You'd rather something land awkwardly than land safely" is better.
- If they gave thin input, ask the profile to reflect that — say "this is a rough sketch" in the summary and keep dimensions hedged.
- Never flatter. Never editorialize positively ("great taste!"). You are a mirror, not a fan.
- Output valid JSON. No markdown fences. No preamble.`;

const RECS_SYSTEM = `You are Palate. You are given a taste profile and must recommend 11 cross-category items this person will likely love. Pick the ONE BEST as the hero and 10 more for a browse feed.

Categories to spread across: film, book, music, food, place, show, podcast, game. You do NOT need to use all categories — use whichever best fit the profile. Aim for 4-6 categories represented.

Output JSON ONLY:
{
  "hero": Recommendation,
  "browse": Recommendation[] // 10 items
}

Each Recommendation:
{
  "id": string,          // short slug, e.g. "good-time"
  "category": "film" | "book" | "music" | "food" | "place" | "show" | "podcast" | "game",
  "title": string,
  "creator": string?,    // director, author, artist, chef — if applicable
  "year": number?,
  "hook": string,        // one sentence. Not a review. A reason to lean in.
  "whyYou": string,      // 1-2 sentences written TO the user in second person, referencing THEIR profile. Be specific. No generic "you'll love this."
  "tags": string[],      // 1-3 dimensions from their profile that this hits
  "confidence": number   // 0-1. Be honest; don't max out everything.
}

Rules:
- Do NOT recommend items they mentioned. Read the source text for hints of what they already know.
- Mix well-known and obscure. About 60/40.
- "whyYou" must reference the profile specifically. If you can't say why THIS person would like it, pick something else.
- Do not recommend safe, canonical choices unless they deeply fit. No "The Godfather" as a safe bet.
- Output valid JSON. No markdown fences.`;

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

async function callClaudeText(client: Anthropic, system: string, user: string): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response shape from Claude");
  }
  return block.text;
}

export async function generate(sourceText: string): Promise<GenerateResponse> {
  const client = getClient();
  if (!client) return mockResponse(sourceText);

  try {
    const profileText = await callClaudeText(client, PROFILE_SYSTEM, sourceText);
    const profileRaw = extractJson(profileText) as Omit<TasteProfile, "sourceText">;
    const profile: TasteProfile = { ...profileRaw, sourceText };

    const recsPrompt = `Taste profile:\n${JSON.stringify(profile, null, 2)}\n\nOriginal source text from user:\n"""${sourceText}"""`;
    const recsText = await callClaudeText(client, RECS_SYSTEM, recsPrompt);
    const recsRaw = extractJson(recsText) as { hero: Recommendation; browse: Recommendation[] };

    const recs: RecSet = {
      hero: recsRaw.hero,
      browse: recsRaw.browse,
      generatedAt: new Date().toISOString(),
    };

    return { profile, recs, demo: false };
  } catch (err) {
    console.error("Claude call failed, falling back to demo mode:", err);
    return mockResponse(sourceText);
  }
}

export async function regenerateRecs(profile: TasteProfile, avoidTitles: string[] = []): Promise<RecSet> {
  const client = getClient();
  if (!client) return mockResponse(profile.sourceText).recs;

  const avoid = avoidTitles.length ? `\n\nAlready shown (do not repeat): ${avoidTitles.join(", ")}` : "";
  const prompt = `Taste profile:\n${JSON.stringify(profile, null, 2)}\n\nOriginal source text:\n"""${profile.sourceText}"""${avoid}`;

  try {
    const recsText = await callClaudeText(client, RECS_SYSTEM, prompt);
    const recsRaw = extractJson(recsText) as { hero: Recommendation; browse: Recommendation[] };
    return { hero: recsRaw.hero, browse: recsRaw.browse, generatedAt: new Date().toISOString() };
  } catch (err) {
    console.error("regenerateRecs failed, falling back to demo:", err);
    return mockResponse(profile.sourceText).recs;
  }
}
