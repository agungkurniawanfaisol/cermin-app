import { describe, expect, it } from "vitest";
import {
  acceptInviteSchema,
  createInviteSchema,
} from "@/server/validations/invite";

describe("createInviteSchema", () => {
  it("rejects invalid email", () => {
    const result = createInviteSchema.safeParse({
      email: "bukan-email",
      role: "TERAPIS",
      name: "Budi",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid invite", () => {
    const result = createInviteSchema.safeParse({
      email: "budi@example.com",
      role: "TERAPIS",
      name: "Budi",
    });
    expect(result.success).toBe(true);
  });
});

describe("acceptInviteSchema", () => {
  it("rejects password without digit", () => {
    const result = acceptInviteSchema.safeParse({
      token: "tokensecret",
      password: "passwordonly",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Kata sandi harus mengandung huruf dan angka",
      );
    }
  });

  it("rejects short password", () => {
    const result = acceptInviteSchema.safeParse({
      token: "tokensecret",
      password: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password with letter and digit", () => {
    const result = acceptInviteSchema.safeParse({
      token: "tokensecret",
      password: "rahasia12",
    });
    expect(result.success).toBe(true);
  });
});
