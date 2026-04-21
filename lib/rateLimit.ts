// Naive in-memory rate limiter. Good enough for v2 — this is a portfolio project running on
// Vercel serverless, so state is per-instance and resets frequently. For real scale, swap this
// for Upstash Redis or Vercel KV. The interface stays the same.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 10;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1, resetAt: now + WINDOW_MS };
  }
  if (existing.count >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { allowed: true, remaining: MAX_PER_WINDOW - existing.count, resetAt: existing.resetAt };
}

export function getClientKey(req: Request): string {
  // Vercel sets x-forwarded-for with the client IP as the first entry.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
