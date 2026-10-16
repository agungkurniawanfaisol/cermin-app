import type { LucideIcon } from "lucide-react";
import {
  ExternalLink,
  Globe,
  MessageCircle,
  Share2,
  Video,
} from "lucide-react";
import type { BrandingPublic } from "@/lib/branding-public";
import { normalizeWhatsappHref } from "@/lib/branding-public";

export type BrandingSocialItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function buildBrandingSocial(
  branding: BrandingPublic,
): BrandingSocialItem[] {
  const items: BrandingSocialItem[] = [];
  if (branding.websiteUrl) {
    items.push({
      href: branding.websiteUrl,
      label: "Situs web",
      icon: Globe,
    });
  }
  if (branding.instagramUrl) {
    items.push({
      href: branding.instagramUrl,
      label: "Instagram",
      icon: Share2,
    });
  }
  if (branding.facebookUrl) {
    items.push({
      href: branding.facebookUrl,
      label: "Facebook",
      icon: ExternalLink,
    });
  }
  if (branding.youtubeUrl) {
    items.push({
      href: branding.youtubeUrl,
      label: "YouTube",
      icon: Video,
    });
  }
  if (branding.whatsappUrl) {
    items.push({
      href: normalizeWhatsappHref(branding.whatsappUrl),
      label: "WhatsApp",
      icon: MessageCircle,
    });
  }
  return items;
}

export function hasInstitutionContact(branding: BrandingPublic): boolean {
  return Boolean(
    branding.name?.trim() ||
      branding.address?.trim() ||
      branding.websiteUrl ||
      branding.instagramUrl ||
      branding.facebookUrl ||
      branding.youtubeUrl ||
      branding.whatsappUrl,
  );
}
