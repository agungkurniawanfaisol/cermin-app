"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  endLearningSession,
  type SessionForReader,
} from "@/server/actions/sessions";
import { ObservationPanel } from "./observation-panel";
import { PageAudioButton, PageImage } from "./page-media";

export function SessionReader({ session }: { session: SessionForReader }) {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ended = Boolean(session.endedAt);

  const pages = session.pages;
  const page = pages[pageIndex] ?? null;
  const total = pages.length;

  const primaryImage = useMemo(
    () => page?.images[0] ?? null,
    [page],
  );
  const primaryAudio = useMemo(
    () => page?.audios[0] ?? null,
    [page],
  );

  function goPrev() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setPageIndex((i) => Math.min(total - 1, i + 1));
  }

  function onEndSession() {
    if (!window.confirm("Akhiri sesi belajar ini?")) return;
    setError(null);
    startTransition(async () => {
      const result = await endLearningSession({ sessionId: session.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (total === 0) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8">
        <p className="text-lg text-[#5c6b73]">
          Cerita ini belum punya halaman.
        </p>
        <Link
          href="/dashboard/sesi"
          className="mt-6 text-[#3d7c6b] underline underline-offset-2"
        >
          Kembali ke Sesi
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-base font-semibold tracking-wide text-[#3d7c6b] uppercase">
            CERMIN
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            {session.story.title}
          </h1>
          <p className="mt-1 text-base text-[#5c6b73]">
            Bersama {session.student.displayName}
            {ended ? " · Sesi selesai" : ""}
          </p>
        </div>
        <p className="text-base text-[#5c6b73]" aria-live="polite">
          Halaman {pageIndex + 1} dari {total}
        </p>
      </header>

      <section className="flex flex-1 flex-col gap-6">
        {primaryImage ? (
          <PageImage key={primaryImage.id} image={primaryImage} />
        ) : null}

        <p className="whitespace-pre-wrap text-center text-2xl leading-relaxed sm:text-3xl">
          {page?.bodyText?.trim()
            ? page.bodyText
            : "Halaman ini belum ada teks."}
        </p>

        {primaryAudio ? (
          <PageAudioButton key={primaryAudio.id} audio={primaryAudio} />
        ) : null}
      </section>

      <nav
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
        aria-label="Navigasi halaman"
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={pageIndex === 0}
          className="min-h-16 min-w-[10rem] rounded-2xl border-2 border-[#d9e2ec] bg-white px-8 py-4 text-2xl font-semibold text-[#1f2933] shadow-sm hover:bg-[#eef6f2] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3d7c6b] disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={pageIndex >= total - 1}
          className="min-h-16 min-w-[10rem] rounded-2xl border-2 border-[#3d7c6b] bg-[#3d7c6b] px-8 py-4 text-2xl font-semibold text-white shadow-sm hover:bg-[#34695b] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3d7c6b] disabled:opacity-40"
        >
          Berikutnya
        </button>
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-base">
        <Link
          href="/dashboard/sesi"
          className="text-[#5c6b73] underline underline-offset-2 hover:text-[#3d7c6b]"
        >
          Kembali ke dasbor
        </Link>
        {!ended ? (
          <button
            type="button"
            onClick={onEndSession}
            disabled={pending}
            className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-2 font-semibold text-[#5c6b73] hover:bg-[#f0ebe3] disabled:opacity-50"
          >
            {pending ? "Mengakhiri…" : "Akhiri sesi"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-center text-[#9b1c1c]" role="alert">
          {error}
        </p>
      ) : null}

      <ObservationPanel
        sessionId={session.id}
        observations={session.observations}
        disabled={ended}
      />
    </main>
  );
}
