import { NextRequest } from "next/server";
import { regenerateRecs } from "@/lib/anthropic";
import type { TasteProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { profile?: TasteProfile; avoid?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.profile || !body.profile.headline) {
    return Response.json({ error: "Missing profile" }, { status: 400 });
  }

  const recs = await regenerateRecs(body.profile, body.avoid ?? []);
  return Response.json({ recs });
}
