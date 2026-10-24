import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getCachedSignedUrl,
  setCachedSignedUrl,
} from "@/lib/signed-url-cache";
import {
  AuthzError,
  loadMediaForSignedUrl,
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

    const media = await loadMediaForSignedUrl(user, parsed.data.id);
    let signedUrl = getCachedSignedUrl(media.storageBucket, media.storageKey);
    if (!signedUrl) {
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
      signedUrl = data.signedUrl;
      setCachedSignedUrl(
        media.storageBucket,
        media.storageKey,
        signedUrl,
        SIGNED_TTL_SECONDS,
      );
    }

    if (request.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(signedUrl);
    }

    return NextResponse.json(
      { url: signedUrl },
      {
        headers: {
          "Cache-Control": "private, max-age=120, stale-while-revalidate=60",
        },
      },
    );
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
