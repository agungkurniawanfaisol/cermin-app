"use server";

import type { TextSize } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireSession } from "@/server/policies/access";
import {
  updatePreferenceSchema,
  type UpdatePreferenceInput,
} from "@/server/validations/preference";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

export type UserPreferenceView = {
  textSize: TextSize;
  audioEnabled: boolean;
};

/** Ambil preferensi; buat default jika belum ada. */
export async function getMyPreference(): Promise<UserPreferenceView> {
  const user = await requireSession();
  const existing = await prisma.userPreference.findUnique({
    where: { userId: user.id },
    select: { textSize: true, audioEnabled: true },
  });
  if (existing) return existing;

  return prisma.userPreference.create({
    data: { userId: user.id },
    select: { textSize: true, audioEnabled: true },
  });
}

export async function updateMyPreference(
  input: UpdatePreferenceInput,
): Promise<ActionResult<UserPreferenceView>> {
  try {
    const user = await requireSession();
    const parsed = updatePreferenceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const pref = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        textSize: parsed.data.textSize,
        audioEnabled: parsed.data.audioEnabled,
      },
      update: {
        textSize: parsed.data.textSize,
        audioEnabled: parsed.data.audioEnabled,
      },
      select: { textSize: true, audioEnabled: true },
    });

    await writeAudit({
      actorId: user.id,
      action: "preference.update",
      entityType: "UserPreference",
      entityId: user.id,
      metadata: {
        textSize: pref.textSize,
        audioEnabled: pref.audioEnabled,
      },
    });

    revalidatePath("/dashboard/pengaturan");
    revalidatePath("/belajar");
    return { ok: true, data: pref };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menyimpan preferensi"),
    };
  }
}
