# Palate

A taste profiler. You describe a few things you love — films, books, music, food, places — and *why*. Palate reads between the lines, builds a portrait of your taste, and recommends a hero pick plus ten more cross-category items you probably haven't found.

It's the version of a recommender that asks "why do you love what you love?" instead of "what genre?"

## Why this exists

Most recommenders are collaborative filtering wearing a coat — good at *what's popular for people like you*, bad at *what you specifically will love*. Palate flips that: it prompts you to articulate your taste in your own words, then uses an LLM to map it to texture-level dimensions (anxious intensity, low tolerance for sentimentality, craft-forward, etc.) and recommends against those.

Two differentiators being tested:

1. **Metacognition as a feature.** The profile handed back is half the product. You learn something about yourself reading it.
2. **Cross-category.** A recommender that treats "the thing you want to watch tonight" and "where you want to go on vacation" as the same kind of problem.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS 4
- Google Gemini SDK (`@google/generative-ai`) — Gemini 2.0 Flash for taste profiling and recommendations. Structured output (`responseMimeType: "application/json"` + `responseSchema`) eliminates JSON-extraction fragility.
- `zod` for defense-in-depth validation of LLM output (with a correction-turn retry on schema failure)
- `html-to-image` for the PNG-export "save as card" flow (dynamic-imported)
- No database. Taste profiles are encoded into the URL (base64url JSON), so profiles are shareable via link without any backend state. Feedback ratings + recent-profile history live in `localStorage`.

## Running it

```bash
npm install
cp .env.example .env.local
# Grab a free key at https://aistudio.google.com/apikey and paste into .env.local
npm run dev
```

Open <http://localhost:3000>.

Without an API key, Palate runs in **demo mode** and returns a fixed mock profile + recommendations so the UI is fully usable offline. Useful for screenshots, design work, and reviews.

### Scripts

```bash
npm run dev          # next dev
npm run build        # next build
npm run lint         # eslint
npm test             # vitest run
npm run test:watch   # vitest (watch mode)
```

## Deploying

Built for Vercel. Push to GitHub, import the repo in Vercel, add `GOOGLE_API_KEY` as an env var. No DB to configure.

**Key safety.** The API key is read server-side (`process.env.GOOGLE_API_KEY`) inside a Next.js Route Handler. It is NOT prefixed with `NEXT_PUBLIC_`, which means Next.js keeps it out of the client JavaScript bundle — the key never leaves the server. `.env.local` is gitignored; `.env.example` (committed) contains no secret value. The only way a key leaks from this setup is if you manually commit `.env.local` with `git add -f`, paste it into a client component, or share your screen showing it.

## Structure

```
app/
  page.tsx                       # landing + recent-profiles strip
  new/page.tsx                   # taste intake form
  taste/[id]/page.tsx            # shareable profile + recs
  taste/[id]/opengraph-image.tsx # dynamic 1200×630 OG card
  api/generate/route.ts          # POST text → profile + recs
  api/recs/route.ts              # POST profile → regenerate recs
  error.tsx / not-found.tsx / loading.tsx / icon.tsx
components/
  TasteProfileCard.tsx           # the framed artifact
  ProfileArtifact.tsx            # wrapper tying card to save/share
  SaveCardButton.tsx             # PNG export (fixed-width 1080 stage)
  ShareButton.tsx
  RecCard.tsx                    # rec card + rating pills
  RecsView.tsx                   # hero + browse grid, skeleton loader
  RegenerateButton.tsx
  RecentProfiles.tsx             # localStorage-backed history
lib/
  types.ts                       # zod schemas for all models
  llm.ts                         # Gemini client + prompts + structured output + retry
  encode.ts                      # base64url profile encoding
  mock.ts                        # demo-mode data
  ratings.ts                     # localStorage ratings + profile index
  useRating.ts                   # useSyncExternalStore hook
  serial.ts                      # FNV-1a 6-digit profile serial
  rateLimit.ts                   # in-memory 10/hr/IP limiter
```

## Notes for reviewers

- **Prompts are the product.** Read `lib/llm.ts` — the `PROFILE_SYSTEM` and `RECS_SYSTEM` system prompts are where Palate's point of view lives. Treat edits like code edits.
- **Three terminal states** on generation: `"demo"` (no key — product feature), `"ok"` (happy path), or throw (surfaced to the user as a 502). No silent fallback from a real error to canned mock data — that's the single biggest lie an LLM app can tell.
- **LLM output is zod-validated** before being trusted. On schema failure, the code sends the parse error back to Claude for one correction turn before giving up.
- **Rate limiting** at `lib/rateLimit.ts` is a naive in-memory map — effective for a side project, but on serverless (Vercel) the state is per-instance so it's a soft guard, not a hard wall. The upgrade path is Upstash Redis (~15 line diff).
- **Retention hooks**: per-profile ratings feed back into the next `RECS_SYSTEM` call, and the landing page lists recent profiles from the user's browser. All client-side for now; real retention needs server-side persistence + email capture, noted but not built.
- **PNG export** renders against a fixed 1080px off-screen stage so exports look identical on phone and desktop.

## Tests

```bash
npm test
```

Covers: encode/decode round-trip + garbage rejection, profile serial stability, zod schema boundaries (too few dimensions, bad strength, unknown category, too few browse items), rate limiter per-key isolation and burst behavior.

## Roadmap (post-v3)

- Server-side profile persistence via Vercel KV / Upstash Redis
- Email capture + weekly "one pick" digest keyed off that week's ratings
- `/taste/[a]/vs/[b]` compare route
- Swap back to Anthropic Claude Sonnet for the literary voice if / when budget allows
- Observability (Sentry / Axiom)
- Item detail pages with where-to-find links (JustWatch, Goodreads, Spotify, etc.)

## Development history

Built through three iteration rounds, each reviewed by parallel agents (PM / VC / senior SWE / senior product designer) before shipping:

- **PR #1 (v1 MVP)** — core flow end-to-end, no retention loop, prompts had a point of view but recs skewed canonical.
- **PR #2 (v2 polish)** — profile rebuilt as framed artifact, OG image, ratings loop wired, zod validation + rate limiting, three-state error handling, Fraunces via `next/font`.
- **PR #3 (v3 polish)** — PNG export fixed for mobile (1080px stage), OG polished (summary hook, auto-shrinking headline, zod-validated decode, 1h revalidate), 6-digit serial, retry-with-correction on schema failure, `useSyncExternalStore` for localStorage-backed state, 3-beat card reveal animation, test suite.
