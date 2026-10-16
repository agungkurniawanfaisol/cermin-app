import type { ReactNode } from "react";

/**
 * Soft fade+rise saat konten rute dasbor muncul.
 * Hanya membungkus children — sidebar/topbar di layout tetap diam.
 * Tanpa ViewTransition (hindari overlap Activity / cacheComponents).
 */
export default function DashboardTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="cermin-route-enter dashboard-page-shell flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}
