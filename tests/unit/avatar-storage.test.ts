import { describe, expect, it } from "vitest";
import {
  studentFamilyPhotoKey,
  userAvatarKey,
  validateAvatarFile,
} from "@/lib/avatar-storage";

function fakeFile(
  type: string,
  size: number,
  name = "foto.jpg",
): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 16))], { type });
  Object.defineProperty(blob, "size", { value: size });
  return new File([blob], name, { type });
}

describe("validateAvatarFile", () => {
  it("accepts jpeg under 2MB", () => {
    const result = validateAvatarFile(fakeFile("image/jpeg", 1024));
    expect(result).toEqual({ ok: true, ext: "jpg" });
  });

  it("rejects wrong mime", () => {
    const result = validateAvatarFile(fakeFile("image/gif", 1024));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/JPEG|PNG|WebP/i);
    }
  });

  it("rejects oversize", () => {
    const result = validateAvatarFile(
      fakeFile("image/png", 3 * 1024 * 1024),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/2 MB/i);
    }
  });

  it("rejects empty file", () => {
    const result = validateAvatarFile(fakeFile("image/png", 0));
    expect(result.ok).toBe(false);
  });
});

describe("avatar key helpers", () => {
  it("builds user and family keys", () => {
    expect(userAvatarKey("u1", "jpg")).toMatch(
      /^avatars\/users\/u1\/.+\.jpg$/,
    );
    expect(studentFamilyPhotoKey("s1", "ayah", "png")).toMatch(
      /^avatars\/students\/s1\/father\/.+\.png$/,
    );
    expect(studentFamilyPhotoKey("s1", "ibu", "webp")).toMatch(
      /\/mother\//,
    );
    expect(studentFamilyPhotoKey("s1", "murid", "jpg")).toMatch(/\/self\//);
  });
});
