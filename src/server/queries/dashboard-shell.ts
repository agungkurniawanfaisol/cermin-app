import { cache } from "react";
import { requireSession } from "@/server/policies/access";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-nav";
import {
  getBrandingPublic,
  type BrandingPublic,
} from "@/server/queries/branding";

export type DashboardShellUser = {
  name: string;
  email: string;
  role: string;
  /** Client fetches `/api/avatar/me` — jangan query Prisma di tiap navigasi. */
  hasImage: boolean;
};

/** Deduped per request — layout chrome shares one session (no avatar DB hit). */
export const getDashboardShellData = cache(async (): Promise<{
  user: DashboardShellUser;
  navItems: DashboardNavItem[];
  branding: BrandingPublic;
}> => {
  const [user, branding] = await Promise.all([
    requireSession(),
    getBrandingPublic(),
  ]);

  const navItems: DashboardNavItem[] = [
    { href: "/dashboard", label: "Dasbor", exact: true },
    { href: "/dashboard/murid", label: "Murid" },
    { href: "/dashboard/cerita", label: "Cerita" },
    { href: "/dashboard/sesi", label: "Sesi" },
    ...(user.role === "ADMIN"
      ? [{ href: "/dashboard/pengguna", label: "Pengguna" }]
      : []),
    { href: "/dashboard/bantuan", label: "Bantuan" },
    { href: "/dashboard/pengaturan", label: "Pengaturan" },
  ];

  return {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      // Always attempt client fetch; API returns null when no avatar.
      hasImage: true,
    },
    navItems,
    branding,
  };
});
