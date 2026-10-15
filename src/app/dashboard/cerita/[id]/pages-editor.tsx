"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStoryPage,
  deleteStoryPage,
  reorderStoryPages,
  updateStoryPage,
} from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PageMediaUploader,
  type PageMediaItem,
} from "./page-media-uploader";

type PageItem = {
  id: string;
  sortOrder: number;
  bodyText: string;
  media: PageMediaItem[];
};

export function PagesEditor({
  storyId,
  pages: initialPages,
  readOnly,
}: {
  storyId: string;
  pages: PageItem[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialPages.map((p) => [p.id, p.bodyText])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function syncFromServer() {
    router.refresh();
  }

  function onAddPage() {
    setError(null);
    startTransition(async () => {
      const result = await createStoryPage({ storyId, bodyText: "" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      syncFromServer();
    });
  }

  function onSavePage(pageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateStoryPage({
        pageId,
        bodyText: drafts[pageId] ?? "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      syncFromServer();
    });
  }

  function onDeletePage(pageId: string) {
    if (!window.confirm("Hapus halaman ini?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteStoryPage(pageId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      syncFromServer();
    });
  }

  function movePage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;
    const reordered = [...pages];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item!);
    setPages(reordered);
    setError(null);
    startTransition(async () => {
      const result = await reorderStoryPages({
        storyId,
        pageIds: reordered.map((p) => p.id),
      });
      if (!result.ok) {
        setError(result.error);
        setPages(initialPages);
        return;
      }
      syncFromServer();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Halaman
        </h2>
        {!readOnly ? (
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={onAddPage}
            disabled={pending}
          >
            Tambah halaman
          </Button>
        ) : null}
      </div>

      {pages.length === 0 ? (
        <p className="text-sm text-[var(--muted,#5c6b73)]">
          Belum ada halaman.
        </p>
      ) : null}

      <ul className="space-y-6">
        {pages.map((page, index) => (
          <li
            key={page.id}
            className="space-y-3 border-t border-[var(--border,#d9e2ec)] pt-4 first:border-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--text,#1f2933)]">
                Halaman {index + 1}
              </p>
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 min-w-11"
                    disabled={pending || index === 0}
                    onClick={() => movePage(index, -1)}
                  >
                    Naik
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 min-w-11"
                    disabled={pending || index === pages.length - 1}
                    onClick={() => movePage(index, 1)}
                  >
                    Turun
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={pending}
                    onClick={() => onDeletePage(page.id)}
                  >
                    Hapus
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`page-${page.id}`}>Teks</Label>
              <Textarea
                id={`page-${page.id}`}
                rows={4}
                value={drafts[page.id] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [page.id]: e.target.value,
                  }))
                }
                disabled={pending || readOnly}
                readOnly={readOnly}
              />
            </div>
            {!readOnly ? (
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                disabled={pending}
                onClick={() => onSavePage(page.id)}
              >
                Simpan halaman
              </Button>
            ) : null}

            <PageMediaUploader
              storyId={storyId}
              pageId={page.id}
              media={page.media}
              readOnly={readOnly}
            />
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
