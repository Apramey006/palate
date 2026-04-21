import { NextRequest } from "next/server";
import { generate } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (text.length < 20) {
    return Response.json({ error: "Tell us a bit more — at least 20 characters." }, { status: 400 });
  }
  if (text.length > 4000) {
    return Response.json({ error: "That's a lot — keep it under 4000 characters." }, { status: 400 });
  }

  const result = await generate(text);
  return Response.json(result);
}
