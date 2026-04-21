import { z } from "zod";

export const CATEGORIES = [
  "film",
  "book",
  "music",
  "food",
  "place",
  "show",
  "podcast",
  "game",
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const TasteDimensionSchema = z.object({
  label: z.string().min(1).max(60),
  strength: z.number().min(0).max(1),
  description: z.string().min(1).max(240),
});
export type TasteDimension = z.infer<typeof TasteDimensionSchema>;

export const TasteProfileSchema = z.object({
  headline: z.string().min(1).max(120),
  summary: z.string().min(1).max(800),
  dimensions: z.array(TasteDimensionSchema).min(3).max(7),
  loves: z.array(z.string().min(1).max(60)).min(1).max(8),
  avoids: z.array(z.string().min(1).max(60)).min(1).max(8),
  sourceText: z.string(),
});
export type TasteProfile = z.infer<typeof TasteProfileSchema>;

export const RecommendationSchema = z.object({
  id: z.string().min(1).max(80),
  category: CategorySchema,
  title: z.string().min(1).max(120),
  creator: z.string().max(120).optional(),
  year: z.number().int().min(1000).max(2100).optional(),
  hook: z.string().min(1).max(240),
  whyYou: z.string().min(1).max(400),
  tags: z.array(z.string().min(1).max(60)).min(1).max(4),
  confidence: z.number().min(0).max(1),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const RecSetSchema = z.object({
  hero: RecommendationSchema,
  browse: z.array(RecommendationSchema).min(6).max(14),
  generatedAt: z.string(),
});
export type RecSet = z.infer<typeof RecSetSchema>;

export type GenerationStatus = "ok" | "demo" | "error";

export interface GenerateResponse {
  profile: TasteProfile;
  recs: RecSet;
  status: GenerationStatus;
}

// Schemas for LLM output (sourceText added server-side; generatedAt added server-side).
export const ProfileFromLLMSchema = TasteProfileSchema.omit({ sourceText: true });
export const RecSetFromLLMSchema = z.object({
  hero: RecommendationSchema,
  browse: z.array(RecommendationSchema).min(6).max(14),
});

export type RecRating = "love" | "meh" | "nope";
export interface StoredRating {
  recId: string;
  title: string;
  rating: RecRating;
  ratedAt: string;
}
