"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export function SessionStartEntry({
  hasStudents,
  hasPublishedStories,
}: {
  hasStudents: boolean;
  hasPublishedStories: boolean;
}) {
  if (!hasStudents) {
    return (
      <div className="rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white px-5 py-8 text-center sm:px-8">
        <p className="text-base text-[var(--cermin-muted,#5c6b73)]">
          Belum ada murid yang dapat Anda akses. Minta admin menugaskan atau
          menautkan murid terlebih dahulu.
        </p>
      </div>
    );
  }

  if (!hasPublishedStories) {
    return (
      <div className="rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white px-5 py-8 text-center sm:px-8">
        <p className="text-base text-[var(--cermin-muted,#5c6b73)]">
          Belum ada cerita terbit untuk sesi.
        </p>
        <Link
          href="/dashboard/cerita"
          className="mt-4 inline-flex min-h-11 items-center font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
        >
          Kelola cerita
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white/90 shadow-[0_12px_32px_-24px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] backdrop-blur-[1px]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,var(--accent-soft,#e6f2ee)_0%,transparent_65%)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-5 px-5 py-10 text-center sm:gap-6 sm:px-10 sm:py-12">
        <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
          Siap belajar bersama
        </p>
        <h2 className="max-w-md text-2xl font-semibold text-[var(--text,#1f2933)] sm:text-3xl">
          Mulai sesi cerita sosial
        </h2>
        <p className="max-w-lg text-sm text-[var(--cermin-muted,#5c6b73)] sm:text-base">
          Pilih kategori dan cerita di layar penuh. Nama murid dipilih saat
          membaca cerita.
        </p>
        <Link
          href="/sesi/mulai?step=category"
          className="group inline-flex min-h-12 min-w-[11rem] items-center justify-center gap-2.5 rounded-full bg-[var(--cermin-accent,#3d7c6b)] px-7 text-base font-semibold text-white shadow-[0_8px_22px_-10px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_45%,transparent)] transition-[transform,background-color] duration-200 hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-14 sm:min-w-[13rem] sm:text-lg"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20 sm:size-10">
            <Play className="size-4 fill-current sm:size-5" aria-hidden />
          </span>
          Mulai Sesi
        </Link>
      </div>
    </div>
  );
}
