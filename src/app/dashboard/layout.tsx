import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  DashboardSidebar,
  DashboardSidebarFallback,
} from "@/components/dashboard/dashboard-sidebar";
import {
  DashboardTopBar,
  DashboardTopBarFallback,
} from "@/components/dashboard/dashboard-top-bar";
import { getDashboardShellData } from "@/server/queries/dashboard-shell";
import { AuthzError } from "@/server/policies/access";

/**
 * Auth + Prisma di chrome — boleh block. Hindari loading.tsx / Suspense page
 * yang wipe konten tiap soft-nav (terasa refresh terus).
 */
export const instant = false;

/** Auth chrome reads cookies — stream behind Suspense; page stays outside. */

async function DashboardAside() {
  try {
    const { user, navItems, branding } = await getDashboardShellData();
    return (
      <DashboardSidebar
        navItems={navItems}
        role={user.role}
        branding={branding}
      />
    );
  } catch (error) {
    if (error instanceof AuthzError && (error.status === 401 || error.status === 403)) {
      redirect("/login");
    }
    throw error;
  }
}

async function DashboardHeader() {
  try {
    const { user, navItems, branding } = await getDashboardShellData();
    return (
      <DashboardTopBar user={user} navItems={navItems} branding={branding} />
    );
  } catch (error) {
    if (error instanceof AuthzError && (error.status === 401 || error.status === 403)) {
      redirect("/login");
    }
    throw error;
  }
}

/**
 * Children sit OUTSIDE auth Suspense so soft-nav tidak tunggu chrome auth
 * selesai sebelum menampilkan konten halaman (Cache Components).
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-[var(--bg,#f7f4ef)] lg:flex">
      <Suspense fallback={<DashboardSidebarFallback />}>
        <DashboardAside />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<DashboardTopBarFallback />}>
          <DashboardHeader />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
