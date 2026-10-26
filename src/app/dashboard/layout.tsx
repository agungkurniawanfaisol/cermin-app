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


/** Auth chrome reads cookies — stream behind Suspense; page stays outside. */


async function DashboardAside() {
  let data;
  try {
    data = await getDashboardShellData();
  } catch (error) {
    if (error instanceof AuthzError && (error.status === 401 || error.status === 403)) {
      redirect("/login");
    }
    throw error;
  }
  return (
    <DashboardSidebar
      navItems={data.navItems}
      role={data.user.role}
      branding={data.branding}
    />
  );
}

async function DashboardHeader() {
  let data;
  try {
    data = await getDashboardShellData();
  } catch (error) {
    if (error instanceof AuthzError && (error.status === 401 || error.status === 403)) {
      redirect("/login");
    }
    throw error;
  }
  return (
    <DashboardTopBar
      user={data.user}
      navItems={data.navItems}
      branding={data.branding}
    />
  );
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
