import type { ReactNode } from "react";

export default function BelajarLayout({ children }: { children: ReactNode }) {
  return <div className="belajar-root font-sans">{children}</div>;
}
