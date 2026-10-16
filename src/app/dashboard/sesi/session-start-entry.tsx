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
    <div className="relative overflow-hidden rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[var(--accent-soft,#e6f2ee)]/50"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-5 px-5 py-10 text-center sm:gap-6 sm:px-10 sm:py-14">
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
          className="group inline-flex min-h-14 min-w-[12rem] items-center justify-center gap-3 rounded-full bg-[var(--cermin-accent,#3d7c6b)] px-8 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(61,124,107,0.28)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[var(--focus,#0b6e4f)] hover:shadow-[0_10px_28px_rgba(11,110,79,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-16 sm:min-w-[14rem] sm:text-xl"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white/20 sm:size-11">
            <Play
              className="size-5 fill-current sm:size-6"
              aria-hidden
            />
          </span>
          Mulai Sesi
        </Link>
      </div>
    </div>
  );
}
