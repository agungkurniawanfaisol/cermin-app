"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleHelp,
  Lock,
  Menu,
  Route,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "cn";

const NAV: readonly {
  href: string;
  sectionId: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    href: "#untuk-siapa",
    sectionId: "untuk-siapa",
    label: "Untuk siapa",
    hint: "Admin, terapis, dan orang tua",
    icon: Users,
  },
  {
    href: "#cara-kerja",
    sectionId: "cara-kerja",
    label: "Cara kerja",
    hint: "Dari undangan sampai sesi",
    icon: Route,
  },
  {
    href: "#aman",
    sectionId: "aman",
    label: "Keamanan",
    hint: "Akses peran & media privat",
    icon: Lock,
  },
  {
    href: "#faq",
    sectionId: "faq",
    label: "FAQ",
    hint: "Pertanyaan umum",
    icon: CircleHelp,
  },
] as const;

type LandingHeaderProps = {
  hasLogo: boolean;
  logoVersion: string | null;
};

/**
 * Sticky landing chrome — brand + konteks, nav aktif, CTA jelas.
 */
export function LandingHeader({ hasLogo, logoVersion }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV.map((item) =>
      document.getElementById(item.sectionId),
    ).filter((el): el is HTMLElement => el != null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0),
          );
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.55],
      },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-200 motion-reduce:transition-none",
          scrolled
            ? "border-[var(--cermin-border)] bg-[color-mix(in_srgb,var(--bg)_94%,white)]/95 shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--text)_32%,transparent)] backdrop-blur-md"
            : "border-transparent bg-[color-mix(in_srgb,var(--bg)_82%,white)]/85 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:h-[4.25rem] sm:gap-4 sm:px-8">
          <a
            href="#atas"
            className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            onClick={close}
          >
            <BrandMark
              hasLogo={hasLogo}
              logoVersion={logoVersion}
              showWordmark
              className="min-h-10 sm:min-h-11"
            />
            <span className="hidden min-w-0 flex-col border-l border-[var(--cermin-border)] pl-2.5 lg:flex">
              <span className="truncate text-[0.7rem] leading-tight font-medium tracking-wide text-[var(--cermin-muted)]">
                CERita MIRip Aku
              </span>
              <span className="truncate text-[0.7rem] leading-tight text-[var(--cermin-muted)]/90">
                Cerita sosial tenang
              </span>
            </span>
          </a>

          <nav
            className="ml-auto hidden items-center gap-0.5 md:flex"
            aria-label="Navigasi halaman"
          >
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = activeId === item.sectionId;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--cermin-accent)]"
                      : "text-[var(--cermin-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text)]",
                  )}
                >
                  <Icon
                    className="size-3.5 shrink-0 opacity-80"
                    aria-hidden
                    strokeWidth={1.75}
                  />
                  {item.label}
                </a>
              );
            })}

            <Link
              href="/login"
              className="ml-2 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-[var(--cermin-accent)] px-4 text-sm font-medium text-white shadow-[0_1px_0_color-mix(in_srgb,var(--focus)_35%,transparent)] transition-[opacity,transform] duration-200 hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] active:scale-[0.98] motion-reduce:active:scale-100 sm:px-5"
            >
              Masuk ke dasbor
            </Link>
          </nav>

          <button
            type="button"
            className="ml-auto inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text)] transition-colors duration-200 hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] md:hidden"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>

        <div
          className={cn(
            "h-0.5 w-full bg-gradient-to-r from-[var(--cermin-accent)]/40 via-[var(--accent-soft)] to-transparent transition-opacity duration-200",
            scrolled ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />

        {open ? (
          <div
            id="landing-mobile-nav"
            className="border-t border-[var(--cermin-border)] bg-[var(--surface)] md:hidden"
          >
            <div className="mx-auto w-full max-w-7xl space-y-3 px-4 py-4">
              <nav
                className="flex flex-col gap-1"
                aria-label="Navigasi halaman"
              >
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = activeId === item.sectionId;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
                        active
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--accent-soft)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                          active
                            ? "bg-[var(--surface)] text-[var(--cermin-accent)]"
                            : "bg-[var(--accent-soft)] text-[var(--cermin-accent)]",
                        )}
                      >
                        <Icon
                          className="size-4"
                          aria-hidden
                          strokeWidth={1.75}
                        />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            active
                              ? "text-[var(--cermin-accent)]"
                              : "text-[var(--text)]",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-[var(--cermin-muted)]">
                          {item.hint}
                        </span>
                      </span>
                    </a>
                  );
                })}
                <Link
                  href="/login"
                  onClick={close}
                  className="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-[var(--cermin-accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                >
                  Masuk ke dasbor
                </Link>
              </nav>
            </div>
          </div>
        ) : null}
      </header>
      <div className="h-14 shrink-0 sm:h-[4.25rem]" aria-hidden />
    </>
  );
}
