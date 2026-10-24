import { NextResponse } from "next/server";
import { createAvatarSignedUrl } from "@/lib/avatar-storage";
import { prisma } from "@/lib/db";
import { AuthzError, requireSession } from "@/server/policies/access";

export async function GET() {
  try {
    const user = await requireSession();
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { image: true },
    });
    if (!row?.image || row.image.startsWith("http")) {
      return NextResponse.json(
        { url: null },
        {
          headers: {
            "Cache-Control": "private, max-age=120, stale-while-revalidate=60",
          },
        },
      );
    }

    const signed = await createAvatarSignedUrl(row.image);
    if (!signed.ok) {
      return NextResponse.json({ error: signed.error }, { status: 500 });
    }
    return NextResponse.json(
      { url: signed.url },
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
    return NextResponse.json(
      { error: "Gagal memuat foto profil" },
      { status: 500 },
    );
  }
}
