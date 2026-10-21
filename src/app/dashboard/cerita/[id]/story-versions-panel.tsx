"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreStoryVersion } from "@/server/actions/stories";
import type { ListedStoryVersion } from "@/server/actions/stories";
import { formatDateTimeId } from "@/lib/format-date";
import { Button } from "@/components/ui/button";

type Props = {
  storyId: string;
  versions: ListedStoryVersion[];
  canRestore: boolean;
};

export function StoryVersionsPanel({
  storyId,
  versions,
  canRestore,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRestore(version: ListedStoryVersion) {
    const ok = window.confirm(
      `Pulihkan versi ${version.versionNo}? Cerita menjadi draf. Halaman di luar snapshot dihapus (termasuk media personalisasi pada halaman itu). Teks, soal MCQ, dan metadata diganti dari snapshot.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await restoreStoryVersion({
        storyId,
        versionId: version.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      className="mt-8 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-5"
      aria-labelledby="story-versions-heading"
    >
      <h2
        id="story-versions-heading"
        className="text-lg font-semibold text-[var(--text,#1f2933)]"
      >
        Riwayat versi terbit
      </h2>
      <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
        Setiap publikasi menyimpan snapshot teks halaman dan soal MCQ. Pulihkan
        untuk mengembalikan konten ke draf.
      </p>

      {error ? (
        <p className="mt-3 text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}

      {versions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Belum ada versi. Versi muncul setelah cerita dipublikasikan.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--cermin-border,#d9e2ec)]">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--text,#1f2933)]">
                  Versi {v.versionNo}
                </p>
                <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
                  {formatDateTimeId(v.createdAt)} · {v.createdBy.name}
                </p>
              </div>
              {canRestore ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={pending}
                  onClick={() => onRestore(v)}
                >
                  Pulihkan
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
