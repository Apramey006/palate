import { NextRequest } from "next/server";
import { generate } from "@/lib/llm";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = getClientKey(req);
  const rl = checkRateLimit(key);
  if (!rl.allowed) {
    return Response.json(
      {
        error:
          "You've generated a lot of profiles in a short window. Give it an hour and try again.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (text.length < 20) {
    return Response.json(
      { error: "Tell me a little more — a few sentences, not a few words." },
      { status: 400 },
    );
  }
  if (text.length > 4000) {
    return Response.json({ error: "That's a lot — keep it under 4000 characters." }, { status: 400 });
  }

  try {
    const result = await generate(text);
    return Response.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
      },
    });
  } catch (err) {
    console.error("generate() failed:", err);
    return Response.json(
      { error: "The profiler is having a moment. Try again in a few seconds." },
      { status: 502 },
    );
  }
}
