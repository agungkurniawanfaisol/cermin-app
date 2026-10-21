import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("mengizinkan hingga batas lalu menolak", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("memakai kunci terpisah untuk media vs avatar", () => {
    const uid = `u:${Date.now()}:${Math.random()}`;
    const mediaKey = `media:upload:${uid}`;
    const avatarKey = `avatar:user:${uid}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(mediaKey, 3, 60_000).ok).toBe(true);
    }
    expect(checkRateLimit(mediaKey, 3, 60_000).ok).toBe(false);
    expect(checkRateLimit(avatarKey, 3, 60_000).ok).toBe(true);
  });
});
