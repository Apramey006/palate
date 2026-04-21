# Palate

A taste profiler. You describe a few things you love — films, books, music, food, places — and *why*. Palate reads between the lines, builds a portrait of your taste, and recommends a hero pick plus ten more cross-category items you probably haven't found.

It's the version of a recommender that asks "why do you love what you love?" instead of "what genre?"

## Why this exists

Most recommenders are collaborative filtering wearing a coat. They're good at *what's popular for people like you*, bad at *what you specifically will love*. Palate tries to flip that: it prompts you to articulate your taste in your own words, then uses an LLM to map it to texture-level dimensions (anxious intensity, low tolerance for sentimentality, craft-forward, etc.) and recommend against those.

Two differentiators to test:
1. **Metacognition as a feature.** The profile handed back is half the product. You learn something about yourself reading it.
2. **Cross-category.** A recommender that treats "the thing you want to watch tonight" and "where you want to go on vacation" as the same kind of problem.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Anthropic SDK (`@anthropic-ai/sdk`) — Claude Sonnet for taste profiling and recommendations
- No database. Taste profiles are encoded into the URL (base64url JSON), so profiles are shareable via link without any backend state.

## Running it

```bash
npm install
cp .env.example .env.local
# Drop your Anthropic API key into .env.local
npm run dev
```

Open <http://localhost:3000>.

Without an API key, Palate runs in demo mode and returns a fixed mock profile + recommendations. The UI is fully functional in demo mode — useful for screenshots, local styling work, and reviews.

## Deploying

Built for Vercel. Push to GitHub, import the repo in Vercel, add `ANTHROPIC_API_KEY` as an env var. No DB to configure.

## Structure

```
app/
  page.tsx              # landing
  new/page.tsx          # taste intake (client form)
  taste/[id]/page.tsx   # shareable profile + recs
  api/generate/route.ts # POST text → profile + recs
  api/recs/route.ts     # POST profile → regenerate recs
components/
  RecCard.tsx
  RecsView.tsx
  TasteProfileCard.tsx
  ShareButton.tsx
  RegenerateButton.tsx
lib/
  types.ts
  anthropic.ts          # Claude client + prompts
  encode.ts             # base64url profile encoding
  mock.ts               # demo-mode data
```

## Roadmap (post-v1)

- Persistent accounts + save multiple profiles
- Feedback loop: ratings refine the profile over time
- Friend-matching: compare two profiles and find the overlap
- Item detail pages with where-to-find links (JustWatch, Goodreads, Spotify, etc.)
- Taste evolution timeline
