import { randomUUID } from "node:crypto";
import {
  AVATAR_BUCKET,
  createAvatarSignedUrl,
  deleteAvatarObject,
  uploadAvatarObject,
  validateAvatarFile,
} from "@/lib/avatar-storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const MCQ_BUCKET = AVATAR_BUCKET;

export function pageMcqPromptKey(
  storyId: string,
  pageId: string,
  ext: string,
): string {
  return `stories/${storyId}/pages/${pageId}/mcq/prompt-${randomUUID()}.${ext}`;
}

export function pageMcqChoiceKey(
  storyId: string,
  pageId: string,
  choiceKey: string,
  ext: string,
): string {
  return `stories/${storyId}/pages/${pageId}/mcq/choice-${choiceKey}-${randomUUID()}.${ext}`;
}

export async function createMcqImageSignedUrl(
  storageKey: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  return createAvatarSignedUrl(storageKey);
}

/** Batch signed URL untuk banyak kunci MCQ (satu round-trip Storage). */
export async function createMcqImagesSignedUrlMap(
  storageKeys: Array<string | null | undefined>,
  ttlSeconds = 300,
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      storageKeys.filter((k): k is string => typeof k === "string" && k.length > 0),
    ),
  ];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(MCQ_BUCKET)
      .createSignedUrls(unique, ttlSeconds);
    if (error || !data) return out;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const key = unique[i];
      if (row?.signedUrl && key) out.set(key, row.signedUrl);
    }
  } catch {
    // caller jatuh ke null URL
  }
  return out;
}

export {
  validateAvatarFile as validateMcqImageFile,
  uploadAvatarObject as uploadMcqImageObject,
  deleteAvatarObject as deleteMcqImageObject,
};
