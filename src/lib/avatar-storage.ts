import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getCachedSignedUrl,
  setCachedSignedUrl,
} from "@/lib/signed-url-cache";

export const AVATAR_BUCKET = "cermin-media";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_SIGNED_TTL_SECONDS = 300;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateAvatarFile(
  file: File,
): { ok: true; ext: string } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "File foto wajib diunggah" };
  }
  if (!IMAGE_MIMES.has(file.type)) {
    return { ok: false, error: "Foto harus JPEG, PNG, atau WebP" };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 2 MB" };
  }
  return { ok: true, ext: MIME_EXT[file.type]! };
}

export function userAvatarKey(userId: string, ext: string): string {
  return `avatars/users/${userId}/${randomUUID()}.${ext}`;
}

export type StudentPhotoSlot = "murid" | "ayah" | "ibu";

export function studentAvatarKey(studentId: string, ext: string): string {
  return `avatars/students/${studentId}/${randomUUID()}.${ext}`;
}

export function studentFamilyPhotoKey(
  studentId: string,
  slot: StudentPhotoSlot,
  ext: string,
): string {
  const folder =
    slot === "murid" ? "self" : slot === "ayah" ? "father" : "mother";
  return `avatars/students/${studentId}/${folder}/${randomUUID()}.${ext}`;
}

export async function uploadAvatarObject(
  storageKey: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storageKey, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (error) {
    return { ok: false, error: "Gagal mengunggah foto" };
  }
  return { ok: true };
}

export async function createAvatarSignedUrl(
  storageKey: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const cached = getCachedSignedUrl(AVATAR_BUCKET, storageKey);
  if (cached) {
    return { ok: true, url: cached };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(storageKey, AVATAR_SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return { ok: false, error: "Gagal membuat URL foto" };
  }
  setCachedSignedUrl(
    AVATAR_BUCKET,
    storageKey,
    data.signedUrl,
    AVATAR_SIGNED_TTL_SECONDS,
  );
  return { ok: true, url: data.signedUrl };
}

/** Best-effort delete of previous private avatar key. */
export async function deleteAvatarObject(storageKey: string | null | undefined) {
  if (!storageKey || storageKey.startsWith("http")) return;
  try {
    await getSupabaseAdmin().storage.from(AVATAR_BUCKET).remove([storageKey]);
  } catch {
    // ignore cleanup failures
  }
}
