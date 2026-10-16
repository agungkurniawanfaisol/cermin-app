import { NextResponse } from "next/server";
import {
  BRANDING_ID,
  downloadBrandingObject,
} from "@/lib/branding-storage";
import { prisma } from "@/lib/db";

/** Logo lembaga — publik (landing). Stream dari bucket privat via service role. */
export async function GET() {
  try {
    const row = await prisma.institutionBranding.findUnique({
      where: { id: BRANDING_ID },
      select: { logoKey: true, logoMime: true, updatedAt: true },
    });
    if (!row?.logoKey) {
      return new NextResponse(null, { status: 404 });
    }

    const file = await downloadBrandingObject(row.logoKey);
    if (!file.ok) {
      return NextResponse.json({ error: file.error }, { status: 500 });
    }

    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": row.logoMime || file.contentType,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        ETag: `"${row.updatedAt.toISOString()}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat logo" },
      { status: 500 },
    );
  }
}
