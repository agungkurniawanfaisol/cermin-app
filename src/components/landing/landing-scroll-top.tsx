"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "cn";

const SHOW_AFTER_PX = 320;

/**
 * Tombol ke atas — muncul setelah scroll turun.
 * Target #atas agar selaras header / scroll-padding.
 */
export function LandingScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goTop() {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={goTop}
      aria-label="Kembali ke atas"
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-5 right-4 z-40 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--cermin-border)] bg-[var(--surface)] text-[var(--cermin-accent)] shadow-[0_10px_28px_-16px_color-mix(in_srgb,var(--text)_35%,transparent)] transition-[opacity,transform,background-color] duration-200 sm:bottom-8 sm:right-8",
        "hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
        "motion-reduce:transition-none",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden strokeWidth={2} />
    </button>
  );
}
