import { randomUUID } from "node:crypto";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_SIGNED_TTL_SECONDS,
  deleteAvatarObject,
  uploadAvatarObject,
  validateAvatarFile,
} from "@/lib/avatar-storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const BRANDING_ID = "default";
export const BRANDING_MAX_BYTES = AVATAR_MAX_BYTES;
export const BRANDING_SIGNED_TTL_SECONDS = AVATAR_SIGNED_TTL_SECONDS;

export function brandingLogoKey(ext: string): string {
  return `branding/logo/${randomUUID()}.${ext}`;
}

export { validateAvatarFile as validateBrandingLogoFile };
export { uploadAvatarObject as uploadBrandingLogoObject };
export { deleteAvatarObject as deleteBrandingLogoObject };

export async function createBrandingSignedUrl(
  storageKey: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(storageKey, BRANDING_SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return { ok: false, error: "Gagal membuat URL logo" };
  }
  return { ok: true, url: data.signedUrl };
}

export async function downloadBrandingObject(
  storageKey: string,
): Promise<
  | { ok: true; body: ArrayBuffer; contentType: string }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .download(storageKey);
  if (error || !data) {
    return { ok: false, error: "Gagal mengunduh logo" };
  }
  return {
    ok: true,
    body: await data.arrayBuffer(),
    contentType: data.type || "image/png",
  };
}
