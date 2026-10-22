import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  AuthzError,
  loadGuideForDownload,
  requireSession,
} from "@/server/policies/access";
import { guideIdSchema } from "@/server/validations/help";

const SIGNED_TTL_SECONDS = 120;

/**
 * Authz-gated signed URL for guide PDFs in private bucket `cermin-media`.
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
    const parsed = guideIdSchema.safeParse({ id: rawId });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "ID petunjuk tidak valid",
        },
        { status: 400 },
      );
    }
    const { id } = parsed.data;

    const guide = await loadGuideForDownload(user, id);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(guide.storageBucket)
      .createSignedUrl(guide.storageKey, SIGNED_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Gagal membuat URL petunjuk" },
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
    return NextResponse.json(
      { error: "Gagal memuat petunjuk" },
      { status: 500 },
    );
  }
}
