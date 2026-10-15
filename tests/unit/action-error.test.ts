import { describe, expect, it } from "vitest";
import { toActionError } from "@/lib/action-error";
import { AuthzError } from "@/server/policies/access";

describe("toActionError", () => {
  it("passes through AuthzError message", () => {
    expect(toActionError(new AuthzError("Akses ditolak"), "fallback")).toBe(
      "Akses ditolak",
    );
  });

  it("does not leak generic Error messages", () => {
    expect(
      toActionError(
        new Error("Unique constraint failed on email"),
        "Gagal menyimpan",
      ),
    ).toBe("Gagal menyimpan");
  });

  it("does not leak non-Error values", () => {
    expect(toActionError({ code: "P2002" }, "Gagal")).toBe("Gagal");
  });
});
