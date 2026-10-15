import type { ReactNode } from "react";

export default function BelajarLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="belajar-root"
      style={{
        fontFamily:
          '"Comic Sans MS", "Comic Sans", "Chalkboard SE", "Marker Felt", cursive, sans-serif',
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
