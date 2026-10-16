"use server";

import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import {
  BRANDING_ID,
  brandingLogoKey,
  deleteBrandingLogoObject,
  uploadBrandingLogoObject,
  validateBrandingLogoFile,
} from "@/lib/branding-storage";
import { normalizeWhatsappHref } from "@/lib/branding-public";
import { prisma } from "@/lib/db";
import { requireRole } from "@/server/policies/access";
import { institutionProfileSchema } from "@/server/validations/branding";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function ensureBrandingRow() {
  await prisma.institutionBranding.upsert({
    where: { id: BRANDING_ID },
    create: { id: BRANDING_ID },
    update: {},
  });
}

export async function uploadInstitutionLogo(
  formData: FormData,
): Promise<ActionResult<{ hasLogo: true }>> {
  try {
    const admin = await requireRole("ADMIN");
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return { ok: false, error: "File logo wajib diunggah" };
    }
    const validated = validateBrandingLogoFile(fileEntry);
    if (!validated.ok) return { ok: false, error: validated.error };

    await ensureBrandingRow();
    const existing = await prisma.institutionBranding.findUnique({
      where: { id: BRANDING_ID },
      select: { logoKey: true },
    });

    const storageKey = brandingLogoKey(validated.ext);
    const uploaded = await uploadBrandingLogoObject(storageKey, fileEntry);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };

    await prisma.institutionBranding.update({
      where: { id: BRANDING_ID },
      data: {
        logoKey: storageKey,
        logoMime: fileEntry.type,
        updatedById: admin.id,
      },
    });
    await deleteBrandingLogoObject(existing?.logoKey);

    await writeAudit({
      actorId: admin.id,
      action: "branding.logo.upload",
      entityType: "InstitutionBranding",
      entityId: BRANDING_ID,
    });

    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/pengaturan");
    return { ok: true, data: { hasLogo: true } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengunggah logo"),
    };
  }
}

export async function removeInstitutionLogo(): Promise<
  ActionResult<{ hasLogo: false }>
> {
  try {
    const admin = await requireRole("ADMIN");
    await ensureBrandingRow();
    const existing = await prisma.institutionBranding.findUnique({
      where: { id: BRANDING_ID },
      select: { logoKey: true },
    });

    await prisma.institutionBranding.update({
      where: { id: BRANDING_ID },
      data: {
        logoKey: null,
        logoMime: null,
        updatedById: admin.id,
      },
    });
    await deleteBrandingLogoObject(existing?.logoKey);

    await writeAudit({
      actorId: admin.id,
      action: "branding.logo.remove",
      entityType: "InstitutionBranding",
      entityId: BRANDING_ID,
    });

    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/pengaturan");
    return { ok: true, data: { hasLogo: false } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus logo"),
    };
  }
}

export async function updateInstitutionProfile(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = institutionProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data profil tidak valid",
      };
    }

    const data = parsed.data;
    const whatsappUrl = data.whatsappUrl
      ? normalizeWhatsappHref(data.whatsappUrl)
      : null;

    await ensureBrandingRow();
    await prisma.institutionBranding.update({
      where: { id: BRANDING_ID },
      data: {
        name: data.name ?? null,
        address: data.address ?? null,
        websiteUrl: data.websiteUrl ?? null,
        instagramUrl: data.instagramUrl ?? null,
        facebookUrl: data.facebookUrl ?? null,
        youtubeUrl: data.youtubeUrl ?? null,
        whatsappUrl,
        updatedById: admin.id,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: "branding.profile.update",
      entityType: "InstitutionBranding",
      entityId: BRANDING_ID,
    });

    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/dashboard/pengaturan");
    return { ok: true, data: { ok: true } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menyimpan profil lembaga"),
    };
  }
}
