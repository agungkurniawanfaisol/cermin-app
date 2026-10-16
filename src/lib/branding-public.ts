/** Public branding helpers — aman untuk komponen client (tanpa Prisma). */

export type BrandingSocial = {
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  whatsappUrl: string | null;
};

export type BrandingPublic = {
  hasLogo: boolean;
  /** Cache-bust query when logo changes. */
  logoVersion: string | null;
  name: string | null;
  address: string | null;
} & BrandingSocial;

export const EMPTY_BRANDING: BrandingPublic = {
  hasLogo: false,
  logoVersion: null,
  name: null,
  address: null,
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  youtubeUrl: null,
  whatsappUrl: null,
};

export function brandingLogoSrc(logoVersion: string | null): string {
  if (!logoVersion) return "/api/branding/logo";
  return `/api/branding/logo?v=${encodeURIComponent(logoVersion)}`;
}

/** Normalisasi nomor WhatsApp → link wa.me bila perlu. */
export function normalizeWhatsappHref(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^wa\.me\//i.test(trimmed)) return `https://${trimmed}`;
  const digits = trimmed.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.length >= 8) return `https://wa.me/${digits}`;
  return trimmed;
}
