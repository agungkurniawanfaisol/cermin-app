import type { ReactNode } from "react";
import { CalmSenseBackdrop } from "@/components/calm/calm-sense-backdrop";

/** Full-bleed start flow — tanpa sidebar/topbar dashboard. */
export default function SesiFullscreenLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh landscape:h-dvh landscape:max-h-dvh landscape:overflow-hidden overflow-x-hidden bg-[var(--bg,#f7f4ef)] text-[var(--text,#1f2933)]">
      <CalmSenseBackdrop variant="sesi" />
      <div className="relative z-10 landscape:h-full">{children}</div>
    </div>
  );
}
