import { describe, expect, it } from "vitest";
import { buildDashboardBreadcrumbs } from "@/lib/dashboard-breadcrumbs";

describe("buildDashboardBreadcrumbs", () => {
  it("roots at dasbor", () => {
    expect(buildDashboardBreadcrumbs("/dashboard")).toEqual([
      { href: "/dashboard", label: "Dasbor", current: true },
    ]);
  });

  it("builds murid baru trail", () => {
    expect(buildDashboardBreadcrumbs("/dashboard/murid/baru")).toEqual([
      { href: "/dashboard", label: "Dasbor", current: false },
      { href: "/dashboard/murid", label: "Murid", current: false },
      { href: "/dashboard/murid/baru", label: "Baru", current: true },
    ]);
  });

  it("masks uuid as detail label", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const crumbs = buildDashboardBreadcrumbs(`/dashboard/cerita/${id}`);
    expect(crumbs.at(-1)).toMatchObject({
      label: "Detail cerita",
      current: true,
    });
  });
});
