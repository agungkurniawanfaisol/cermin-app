import { cache } from "react";
import { prisma } from "@/lib/db";
import { BRANDING_ID } from "@/lib/branding-storage";
import {
  EMPTY_BRANDING,
  type BrandingPublic,
} from "@/lib/branding-public";

export type { BrandingPublic };
export { brandingLogoSrc, EMPTY_BRANDING } from "@/lib/branding-public";

export const getBrandingPublic = cache(async (): Promise<BrandingPublic> => {
  try {
    const row = await prisma.institutionBranding.findUnique({
      where: { id: BRANDING_ID },
      select: {
        logoKey: true,
        updatedAt: true,
        name: true,
        address: true,
        websiteUrl: true,
        instagramUrl: true,
        facebookUrl: true,
        youtubeUrl: true,
        whatsappUrl: true,
      },
    });
    if (!row) return { ...EMPTY_BRANDING };
    return {
      hasLogo: Boolean(row.logoKey),
      logoVersion: row.logoKey ? row.updatedAt.toISOString() : null,
      name: row.name,
      address: row.address,
      websiteUrl: row.websiteUrl,
      instagramUrl: row.instagramUrl,
      facebookUrl: row.facebookUrl,
      youtubeUrl: row.youtubeUrl,
      whatsappUrl: row.whatsappUrl,
    };
  } catch {
    return { ...EMPTY_BRANDING };
  }
});
