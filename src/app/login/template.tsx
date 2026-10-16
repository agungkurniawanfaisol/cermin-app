import type { ReactNode } from "react";

/** Soft fade+rise saat halaman login muncul. */
export default function LoginTemplate({ children }: { children: ReactNode }) {
  return <div className="cermin-route-enter flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
}
