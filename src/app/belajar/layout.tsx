import type { ReactNode } from "react";
import { CalmSenseBackdrop } from "@/components/calm/calm-sense-backdrop";

export default function BelajarLayout({ children }: { children: ReactNode }) {
  return (
    <div className="belajar-root relative font-sans">
      <CalmSenseBackdrop variant="belajar" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
