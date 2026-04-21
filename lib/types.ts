export type Category =
  | "film"
  | "book"
  | "music"
  | "food"
  | "place"
  | "show"
  | "podcast"
  | "game";

export interface TasteDimension {
  label: string;
  strength: number; // 0-1, how strongly this dimension expresses in their taste
  description: string;
}

export interface TasteProfile {
  headline: string; // short memorable phrase capturing their taste, e.g. "Anxious storytelling with a nostalgic edge"
  summary: string; // 2-3 sentence portrait of their taste
  dimensions: TasteDimension[]; // 4-6 axes that describe their taste
  loves: string[]; // surfaced themes they respond to
  avoids: string[]; // surfaced themes they dislike
  sourceText: string; // original free-text input, used to regenerate
}

export interface Recommendation {
  id: string;
  category: Category;
  title: string;
  creator?: string; // director / author / artist / chef / etc.
  year?: number;
  hook: string; // one-sentence elevator pitch
  whyYou: string; // personalized rationale tied to the user's profile (1-2 sentences)
  tags: string[]; // surface the dimensions it matches
  confidence: number; // 0-1, how confident we are in the match
}

export interface RecSet {
  hero: Recommendation; // the one featured pick
  browse: Recommendation[]; // 10-20 additional cross-category picks
  generatedAt: string; // ISO
}

export interface GenerateResponse {
  profile: TasteProfile;
  recs: RecSet;
  demo: boolean; // true if served from mock because no API key
}
