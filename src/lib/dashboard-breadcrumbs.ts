/** Segment path → label Indonesia untuk breadcrumb dasbor. */

const SEGMENT_LABEL: Record<string, string> = {
  dashboard: "Dasbor",
  murid: "Murid",
  cerita: "Cerita",
  sesi: "Sesi",
  pengguna: "Pengguna",
  bantuan: "Bantuan",
  pengaturan: "Pengaturan",
  baru: "Baru",
  undang: "Undang",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BreadcrumbCrumb = {
  href: string;
  label: string;
  current: boolean;
};

function labelForSegment(segment: string, parent?: string): string {
  if (UUID_RE.test(segment)) {
    if (parent === "murid") return "Detail murid";
    if (parent === "cerita") return "Detail cerita";
    return "Detail";
  }
  return SEGMENT_LABEL[segment] ?? segment;
}

/**
 * Bangun jejak breadcrumb dari pathname App Router.
 * Contoh: `/dashboard/murid/baru` → Dasbor › Murid › Baru
 */
export function buildDashboardBreadcrumbs(pathname: string): BreadcrumbCrumb[] {
  const clean = pathname.split("?")[0] ?? pathname;
  const parts = clean.split("/").filter(Boolean);

  if (parts.length === 0 || parts[0] !== "dashboard") {
    return [{ href: "/dashboard", label: "Dasbor", current: true }];
  }

  const crumbs: BreadcrumbCrumb[] = [];
  let href = "";

  for (let i = 0; i < parts.length; i += 1) {
    const segment = parts[i]!;
    href += `/${segment}`;
    const parent = i > 0 ? parts[i - 1] : undefined;
    crumbs.push({
      href,
      label: labelForSegment(segment, parent),
      current: i === parts.length - 1,
    });
  }

  return crumbs;
}
