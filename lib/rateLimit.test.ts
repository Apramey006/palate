import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientKey } from "./rateLimit";

describe("checkRateLimit", () => {
  it("allows the first N requests per key and blocks the rest", () => {
    const key = `test-${Math.random()}`;
    const allowed: boolean[] = [];
    for (let i = 0; i < 11; i++) {
      allowed.push(checkRateLimit(key).allowed);
    }
    // Exact max-per-window is implementation-owned; we just assert that a burst
    // beyond ~10 hits the block.
    expect(allowed.filter(Boolean).length).toBeLessThanOrEqual(10);
    expect(allowed.filter((b) => !b).length).toBeGreaterThanOrEqual(1);
  });

  it("isolates buckets per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 10; i++) checkRateLimit(a);
    // Key a is maxed; key b should still be allowed.
    expect(checkRateLimit(b).allowed).toBe(true);
  });
});

describe("getClientKey", () => {
  it("prefers x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getClientKey(req)).toBe("9.9.9.9");
  });

  it("uses 'unknown' when no header is present", () => {
    const req = new Request("http://localhost");
    expect(getClientKey(req)).toBe("unknown");
  });
});
