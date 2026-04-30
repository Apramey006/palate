# Palate

> A taste profiler and cross-category recommender.

Describe a few things you love — films, books, music, food, places — and *why*. Palate reads between the lines, builds a portrait of your taste, and recommends a hero pick plus ten more cross-category items you probably haven't found.

**Live demo:** [palate-plum.vercel.app](https://palate-plum.vercel.app)

## Features

- **Taste profile** — an LLM-generated portrait of your taste in your own dimensions, not genres.
- **Cross-category recs** — one hero pick plus ten more across films, books, music, food, and places.
- **Shareable** — profiles encode into the URL, no account required.
- **Save as card** — export your profile as a PNG.
- **Demo mode** — runs without an API key against fixed mock data, so the UI is fully usable offline.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Google Gemini 2.0 Flash via `@google/generative-ai` (structured output with `responseSchema`)
- Zod for LLM-output validation
- `html-to-image` for PNG export
- No database — profiles encoded in the URL; ratings + history in `localStorage`

## Getting started

```bash
npm install
cp .env.example .env.local   # add GOOGLE_API_KEY
npm run dev
```

Open <http://localhost:3000>. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/apikey).

Without a key, Palate runs in demo mode with a fixed mock profile.

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:watch` | Vitest (watch) |

## License

MIT
