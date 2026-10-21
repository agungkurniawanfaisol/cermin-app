"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import {
  listPublishedStoriesForSession,
  startLearningSession,
  type PublishedStoryOption,
} from "@/server/actions/sessions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ChangeStoryDialogProps = {
  studentId: string;
  currentStoryId: string;
  /** Opsional — jika kosong, katalog di-fetch saat dialog dibuka. */
  stories?: PublishedStoryOption[];
  disabled?: boolean;
};

export function ChangeStoryDialog({
  studentId,
  currentStoryId,
  stories: initialStories = [],
  disabled = false,
}: ChangeStoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stories, setStories] = useState<PublishedStoryOption[]>(initialStories);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stories) {
      if (s.categoryId && !map.has(s.categoryId)) {
        map.set(s.categoryId, s.categoryName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [stories]);

  const currentStory = stories.find((s) => s.id === currentStoryId);
  const defaultCategoryId =
    currentStory?.categoryId ?? stories[0]?.categoryId ?? "";

  const [selectedCategoryId, setSelectedCategoryId] =
    useState(defaultCategoryId);
  const [selectedStoryId, setSelectedStoryId] = useState(currentStoryId);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setSelectedCategoryId(defaultCategoryId);
      setSelectedStoryId(currentStoryId);
      if (stories.length === 0) {
        setLoadingCatalog(true);
        void listPublishedStoriesForSession()
          .then((rows) => {
            setStories(rows);
            const cur = rows.find((s) => s.id === currentStoryId);
            const catId = cur?.categoryId ?? rows[0]?.categoryId ?? "";
            setSelectedCategoryId(catId);
            const inCat = rows.filter((s) => s.categoryId === catId);
            const match = inCat.find((s) => s.id === currentStoryId);
            setSelectedStoryId(match?.id ?? inCat[0]?.id ?? currentStoryId);
          })
          .catch(() => {
            setError("Gagal memuat daftar cerita");
          })
          .finally(() => setLoadingCatalog(false));
      }
    }
  }

  const filteredStories = useMemo(() => {
    return stories.filter((s) => s.categoryId === selectedCategoryId);
  }, [stories, selectedCategoryId]);

  function handleCategoryChange(newCatId: string) {
    setSelectedCategoryId(newCatId);
    const storiesInCat = stories.filter((s) => s.categoryId === newCatId);
    const matchingStory = storiesInCat.find((s) => s.id === currentStoryId);
    setSelectedStoryId(matchingStory?.id ?? storiesInCat[0]?.id ?? "");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedStoryId) return;

    if (selectedStoryId === currentStoryId) {
      setOpen(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await startLearningSession({
        studentId,
        storyId: selectedStoryId,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push(`/belajar/${result.data.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-4 font-semibold text-[var(--belajar-ink,#1f2933)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] sm:w-auto"
          />
        }
      >
        <BookOpen className="size-4 shrink-0 text-[var(--belajar-accent,#3d7c6b)]" />
        <span>Ganti cerita</span>
      </DialogTrigger>

      <DialogContent className="gap-0 border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-0 sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader className="gap-1.5 border-b border-[var(--cermin-border,#d9e2ec)] px-4 py-4 sm:px-5">
            <DialogTitle className="text-lg font-semibold text-[var(--text,#1f2933)]">
              Ganti Cerita Belajar
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--cermin-muted,#5c6b73)]">
              Pilih kategori tujuan terapi, lalu pilih judul cerita yang ingin
              dipelajari bersama anak.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {loadingCatalog ? (
              <p className="text-sm text-[var(--cermin-muted,#5c6b73)]" role="status">
                Memuat daftar cerita…
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="ganti-kategori"
                    className="text-sm font-semibold text-[var(--text,#1f2933)]"
                  >
                    Kategori cerita
                  </Label>
                  <select
                    id="ganti-kategori"
                    required
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={pending || categories.length === 0}
                    className="flex h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-base text-[var(--text,#1f2933)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="ganti-cerita"
                    className="text-sm font-semibold text-[var(--text,#1f2933)]"
                  >
                    Judul cerita
                  </Label>
                  <select
                    id="ganti-cerita"
                    required
                    value={selectedStoryId}
                    onChange={(e) => setSelectedStoryId(e.target.value)}
                    disabled={pending || filteredStories.length === 0}
                    className="flex h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-base text-[var(--text,#1f2933)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
                  >
                    {filteredStories.map((story) => (
                      <option key={story.id} value={story.id}>
                        {story.title}
                        {story.id === currentStoryId ? " (Sedang aktif)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error ? (
              <p
                className="text-sm font-medium text-[var(--danger,#9b2c2c)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="px-4 py-3 sm:px-5">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="min-h-11 w-full sm:w-auto"
                />
              }
            >
              Batal
            </DialogClose>
            <Button
              type="submit"
              disabled={
                pending ||
                loadingCatalog ||
                !selectedStoryId ||
                selectedStoryId === currentStoryId
              }
              className="min-h-11 w-full bg-[var(--accent,#3d7c6b)] text-white hover:bg-[#34695b] sm:w-auto"
            >
              {pending ? "Memulai cerita…" : "Mulai Cerita Ini"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
