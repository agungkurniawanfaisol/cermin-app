"use server";

import { MediaKind, type MediaAsset } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  assertCanEditStoryContent,
  requireRole,
} from "@/server/policies/access";
import { uploadMediaMetaSchema } from "@/server/validations/media";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

const BUCKET = "cermin-media";
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/wav", "audio/ogg"]);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

function formString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Upload private media to bucket `cermin-media` (must be non-public —
 * docs/ROADMAP.md §3.4). Stores only storageKey; clients use /api/media/[id].
 */
export async function uploadMedia(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return { ok: false, error: "File media wajib diunggah" };
    }

    const meta = uploadMediaMetaSchema.safeParse({
      kind: formString(formData.get("kind")),
      pageId: formString(formData.get("pageId")),
      storyId: formString(formData.get("storyId")),
      altText: formString(formData.get("altText")),
    });
    if (!meta.success) {
      return {
        ok: false,
        error: meta.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { kind, pageId, storyId: storyIdInput, altText = "" } = meta.data;
    const mediaKind = kind === "IMAGE" ? MediaKind.IMAGE : MediaKind.AUDIO;

    const mimeType = fileEntry.type;
    if (mediaKind === MediaKind.IMAGE && !IMAGE_MIMES.has(mimeType)) {
      return {
        ok: false,
        error: "Gambar harus berformat JPEG, PNG, atau WebP",
      };
    }
    if (mediaKind === MediaKind.AUDIO && !AUDIO_MIMES.has(mimeType)) {
      return {
        ok: false,
        error: "Audio harus berformat MPEG, WAV, atau OGG",
      };
    }

    const maxBytes =
      mediaKind === MediaKind.IMAGE ? IMAGE_MAX_BYTES : AUDIO_MAX_BYTES;
    if (fileEntry.size > maxBytes) {
      return {
        ok: false,
        error:
          mediaKind === MediaKind.IMAGE
            ? "Ukuran gambar maksimal 5 MB"
            : "Ukuran audio maksimal 10 MB",
      };
    }

    let storyId: string;
    const resolvedPageId: string | null = pageId ?? null;

    if (pageId) {
      const page = await prisma.storyPage.findUnique({
        where: { id: pageId },
        include: { story: true },
      });
      if (!page) {
        return { ok: false, error: "Halaman tidak ditemukan" };
      }
      if (storyIdInput && storyIdInput !== page.storyId) {
        return { ok: false, error: "Halaman tidak sesuai dengan cerita" };
      }
      assertCanEditStoryContent(user, page.story);
      storyId = page.storyId;
    } else {
      const story = await prisma.story.findUnique({
        where: { id: storyIdInput! },
      });
      if (!story) {
        return { ok: false, error: "Cerita tidak ditemukan" };
      }
      assertCanEditStoryContent(user, story);
      storyId = story.id;
    }

    const ext = MIME_EXT[mimeType];
    if (!ext) {
      return { ok: false, error: "Tipe file tidak didukung" };
    }

    const storageKey = resolvedPageId
      ? `stories/${storyId}/pages/${resolvedPageId}/${randomUUID()}.${ext}`
      : `stories/${storyId}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: "Gagal mengunggah media" };
    }

    const maxSort = await prisma.mediaAsset.aggregate({
      where: resolvedPageId
        ? { pageId: resolvedPageId }
        : { storyId, pageId: null },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    let asset: MediaAsset;
    try {
      asset = await prisma.mediaAsset.create({
        data: {
          storyId,
          pageId: resolvedPageId,
          kind: mediaKind,
          storageBucket: BUCKET,
          storageKey,
          mimeType,
          byteSize: fileEntry.size,
          altText: mediaKind === MediaKind.IMAGE ? altText : altText || null,
          sortOrder,
          createdById: user.id,
        },
      });
    } catch (dbError) {
      await supabase.storage.from(BUCKET).remove([storageKey]);
      throw dbError;
    }

    await writeAudit({
      actorId: user.id,
      action: "media.upload",
      entityType: "MediaAsset",
      entityId: asset.id,
      metadata: {
        storyId,
        pageId: resolvedPageId,
        kind: mediaKind,
        mimeType,
        byteSize: fileEntry.size,
      },
    });

    revalidatePath(`/dashboard/cerita/${storyId}`);
    return { ok: true, data: { id: asset.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengunggah media"),
    };
  }
}
