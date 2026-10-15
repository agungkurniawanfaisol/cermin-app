import { describe, expect, it } from "vitest";
import { z } from "zod";

/** Mirrors login schema in auth-login.ts (kept local so module stays free of Next headers). */
const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib"),
});

describe("loginSchema (auth-login)", () => {
  it("accepts email + password", () => {
    expect(
      loginSchema.safeParse({
        email: "admin@cermin.local",
        password: "x",
      }).success,
    ).toBe(true);
  });

  it("rejects bad email", () => {
    const result = loginSchema.safeParse({
      email: "bukan",
      password: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@cermin.local",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
