import { NextResponse } from "next/server";
import {
  createAvatarSignedUrl,
  type StudentPhotoSlot,
} from "@/lib/avatar-storage";
import { prisma } from "@/lib/db";
import {
  AuthzError,
  assertCanAccessStudent,
  requireSession,
} from "@/server/policies/access";
import { studentIdSchema } from "@/server/validations/student";

function parseSlot(raw: string | null): StudentPhotoSlot {
  if (raw === "ayah" || raw === "ibu" || raw === "murid") return raw;
  return "murid";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id: rawId } = await context.params;
    const parsed = studentIdSchema.safeParse({ studentId: rawId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ID murid tidak valid" },
        { status: 400 },
      );
    }
    const id = parsed.data.studentId;
    await assertCanAccessStudent(user, id);

    const { searchParams } = new URL(request.url);
    const slot = parseSlot(searchParams.get("slot"));

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        imageKey: true,
        fatherImageKey: true,
        motherImageKey: true,
      },
    });

    const storageKey =
      slot === "ayah"
        ? student?.fatherImageKey
        : slot === "ibu"
          ? student?.motherImageKey
          : student?.imageKey;

    if (!storageKey) {
      return NextResponse.json(
        { url: null },
        {
          headers: {
            "Cache-Control": "private, max-age=120, stale-while-revalidate=60",
          },
        },
      );
    }

    const signed = await createAvatarSignedUrl(storageKey);
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
      { error: "Gagal memuat foto" },
      { status: 500 },
    );
  }
}
