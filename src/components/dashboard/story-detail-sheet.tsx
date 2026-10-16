"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { StoryListPreview } from "@/server/actions/stories";
import { getStoryListPreview } from "@/server/actions/stories";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

/** Data dari daftar — tampil instan sebelum preview halaman selesai. */
export type StoryDetailSeed = {
  id: string;
  title: string;
  description: string;
  status: string;
  pageCount: number;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
};

type Props = {
  storyId: string | null;
  seed: StoryDetailSeed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  continueHref: string | null;
  continueLabel: string;
};

function CoverImage({ mediaId }: { mediaId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/media/${mediaId}`);
        const body = (await res.json()) as { url?: string };
        if (cancelled) return;
        if (!res.ok || !body.url) {
          setError(true);
          return;
        }
        setUrl(body.url);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  if (error) {
    return (
      <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
        Cover tidak tersedia.
      </p>
    );
  }
  if (!url) {
    return (
      <div
        className="aspect-[4/3] animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL private bucket
    <img
      src={url}
      alt="Cover cerita"
      className="aspect-[4/3] w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] object-cover"
    />
  );
}

export function StoryDetailSheet({
  storyId,
  seed,
  open,
  onOpenChange,
  continueHref,
  continueLabel,
}: Props) {
  const [preview, setPreview] = useState<StoryListPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);

  useEffect(() => {
    if (!open || !storyId) {
      setPreview(null);
      setError(null);
      setPreviewPage(0);
      setLoadingPages(false);
      return;
    }
    let cancelled = false;
    setLoadingPages(true);
    setError(null);
    void (async () => {
      try {
        const data = await getStoryListPreview(storyId);
        if (cancelled) return;
        setPreview(data);
        setPreviewPage(0);
      } catch {
        if (!cancelled) {
          setError("Gagal memuat pratinjau halaman.");
        }
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storyId]);

  const title = preview?.title ?? seed?.title ?? "Detail cerita";
  const categoryName = preview?.category.name ?? seed?.category.name ?? "";
  const status = preview?.status ?? seed?.status ?? "";
  const description = preview?.description ?? seed?.description ?? "";
  const pageCount = preview?.pageCount ?? seed?.pageCount ?? 0;
  const createdByName = preview?.createdBy.name ?? seed?.createdBy.name ?? "—";
  const learningObjectives = preview?.learningObjectives ?? null;
  const page = preview?.pages[previewPage] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 z-50 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[var(--surface,#ffffff)] p-0 shadow-none ring-0 sm:inset-3 sm:h-auto sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-xl sm:border sm:border-[var(--cermin-border,#d9e2ec)] sm:shadow-lg data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <DialogHeader className="shrink-0 gap-1 border-b border-[var(--cermin-border,#d9e2ec)] px-4 py-4 pr-14 sm:px-6 sm:py-5">
          <DialogTitle className="text-left text-xl text-[var(--text,#1f2933)] sm:text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-left text-[var(--cermin-muted,#5c6b73)]">
            {categoryName
              ? `${categoryName} · ${STATUS_LABEL[status] ?? status}`
              : "Ringkasan dan pratinjau cerita"}
          </DialogDescription>
          <DialogClose
            className="absolute top-3 right-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
            aria-label="Tutup detail"
          >
            <XIcon className="size-4" />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-col gap-4">
              {preview?.coverMediaId ? (
                <CoverImage mediaId={preview.coverMediaId} />
              ) : loadingPages ? (
                <div
                  className="aspect-[4/3] animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
                  aria-hidden
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-4 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
                  Belum ada gambar cover
                </div>
              )}

              <dl className="grid gap-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] p-4 text-sm">
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Pembuat
                  </dt>
                  <dd className="text-[var(--text,#1f2933)]">{createdByName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Jumlah halaman
                  </dt>
                  <dd className="text-[var(--text,#1f2933)]">{pageCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Deskripsi
                  </dt>
                  <dd className="whitespace-pre-wrap text-[var(--text,#1f2933)]">
                    {description.trim() || "—"}
                  </dd>
                </div>
                {learningObjectives != null ? (
                  <div>
                    <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      Tujuan belajar
                    </dt>
                    <dd className="whitespace-pre-wrap text-[var(--text,#1f2933)]">
                      {learningObjectives.trim() || "—"}
                    </dd>
                  </div>
                ) : loadingPages ? (
                  <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Memuat tujuan belajar…
                  </p>
                ) : null}
              </dl>
            </div>

            <section
              className="flex flex-col gap-3"
              aria-label="Pratinjau halaman"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[var(--text,#1f2933)]">
                  Pratinjau halaman
                </h3>
                {preview && preview.pages.length > 0 ? (
                  <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    {previewPage + 1} / {preview.pages.length}
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
                  {error}
                </p>
              ) : null}

              {loadingPages && !preview ? (
                <div className="flex flex-col gap-3">
                  <div className="h-28 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]" />
                  <div className="h-16 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]" />
                  <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
                    Memuat cuplikan halaman…
                  </p>
                </div>
              ) : null}

              {preview ? (
                preview.pages.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-3 py-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
                    Belum ada halaman.
                  </p>
                ) : (
                  <>
                    <div className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-4 py-5">
                      <p className="text-xs font-medium text-[var(--cermin-muted,#5c6b73)]">
                        Halaman {(page?.sortOrder ?? previewPage) + 1}
                      </p>
                      <p className="mt-2 text-base leading-relaxed text-[var(--text,#1f2933)]">
                        {page?.excerpt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 flex-1"
                        disabled={previewPage <= 0}
                        onClick={() =>
                          setPreviewPage((p) => Math.max(0, p - 1))
                        }
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 flex-1"
                        disabled={previewPage >= preview.pages.length - 1}
                        onClick={() =>
                          setPreviewPage((p) =>
                            Math.min(preview.pages.length - 1, p + 1),
                          )
                        }
                      >
                        Berikutnya
                      </Button>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {preview.pages.map((p, index) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setPreviewPage(index)}
                            className={
                              index === previewPage
                                ? "min-h-11 w-full cursor-pointer rounded-lg border border-[var(--cermin-accent,#3d7c6b)] bg-[var(--accent-soft,#e6f2ee)] px-3 py-2 text-left text-sm"
                                : "cermin-hover-card min-h-11 w-full cursor-pointer rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 py-2 text-left text-sm"
                            }
                          >
                            <span className="font-medium text-[var(--text,#1f2933)]">
                              Halaman {index + 1}
                            </span>
                            <span className="mt-0.5 block text-xs text-[var(--cermin-muted,#5c6b73)] line-clamp-2">
                              {p.excerpt}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )
              ) : null}
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/90 p-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
            {continueHref ? (
              <Link
                href={continueHref}
                prefetch
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 sm:w-auto"
              >
                {continueLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
