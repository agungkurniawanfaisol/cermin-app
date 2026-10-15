import type { ReactNode } from "react";

export default function BelajarLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="belajar-root font-sans"
      style={{
        background: "#F7F4EF",
        color: "#1f2933",
        minHeight: "100dvh",
        fontSize: "1.35rem",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
