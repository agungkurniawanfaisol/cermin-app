import { randomUUID } from "node:crypto";
import {
  AVATAR_BUCKET,
  createAvatarSignedUrl,
} from "@/lib/avatar-storage";

/** Same private bucket as avatars / story media (cermin-media). */
export const CATEGORY_BUCKET = AVATAR_BUCKET;

export function categoryCoverKey(categoryId: string, ext: string): string {
  return `categories/${categoryId}/cover-${randomUUID()}.${ext}`;
}

export async function createCategoryCoverSignedUrl(
  storageKey: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  return createAvatarSignedUrl(storageKey);
}
