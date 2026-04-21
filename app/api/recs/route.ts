import { NextRequest } from "next/server";
import { regenerateRecs } from "@/lib/anthropic";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";
import { TasteProfileSchema } from "@/lib/types";
import type { StoredRating } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = getClientKey(req);
  const rl = checkRateLimit(key);
  if (!rl.allowed) {
    return Response.json(
      { error: "Slow down for a bit — you've asked for a lot of picks lately." },
      { status: 429 },
    );
  }

  let body: { profile?: unknown; avoid?: string[]; ratings?: StoredRating[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = TasteProfileSchema.safeParse(body.profile);
  if (!parsed.success) {
    return Response.json({ error: "Missing or malformed profile" }, { status: 400 });
  }

  try {
    const result = await regenerateRecs(parsed.data, body.avoid ?? [], body.ratings ?? []);
    return Response.json(result);
  } catch (err) {
    console.error("regenerateRecs() failed:", err);
    return Response.json(
      { error: "The profiler is having a moment. Try again in a few seconds." },
      { status: 502 },
    );
  }
}
