import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  AuthzError,
  assertCanAccessMedia,
  requireSession,
} from "@/server/policies/access";
import { mediaIdSchema } from "@/server/validations/media";

const SIGNED_TTL_SECONDS = 120;

/**
 * Authz-gated signed URL for private bucket `cermin-media`
 * (bucket must stay non-public — docs/ROADMAP.md §3.4).
 *
 * Default: JSON `{ url }`. Pass `?redirect=1` to redirect to the signed URL.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id: rawId } = await context.params;
    const parsed = mediaIdSchema.safeParse({ id: rawId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ID media tidak valid" },
        { status: 400 },
      );
    }
    const { id } = parsed.data;

    await assertCanAccessMedia(user, id);

    const media = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json(
        { error: "Media tidak ditemukan" },
        { status: 404 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(media.storageBucket)
      .createSignedUrl(media.storageKey, SIGNED_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Gagal membuat URL media" },
        { status: 500 },
      );
    }

    if (request.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(data.signedUrl);
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Gagal memuat media" }, { status: 500 });
  }
}
