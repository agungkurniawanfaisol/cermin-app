import { NextResponse } from "next/server";
import { z } from "zod";
import { createCategoryCoverSignedUrl } from "@/lib/category-storage";
import { prisma } from "@/lib/db";
import { AuthzError, requireSession } from "@/server/policies/access";

const categoryIdSchema = z.object({
  id: z.string().uuid("ID kategori tidak valid"),
});

/**
 * Signed URL cover kategori — lazy per kartu, bukan N kali di list sesi.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id: rawId } = await context.params;
    const parsed = categoryIdSchema.safeParse({ id: rawId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ID kategori tidak valid" },
        { status: 400 },
      );
    }

    const category = await prisma.storyCategory.findUnique({
      where: { id: parsed.data.id },
      select: { imageKey: true },
    });
    if (!category?.imageKey) {
      return NextResponse.json({ url: null });
    }

    const signed = await createCategoryCoverSignedUrl(category.imageKey);
    if (!signed.ok) {
      return NextResponse.json({ error: signed.error }, { status: 500 });
    }
    return NextResponse.json({ url: signed.url });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Gagal memuat cover kategori" },
      { status: 500 },
    );
  }
}
