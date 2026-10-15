"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteGuide,
  updateGuideMeta,
  uploadGuide,
  type ListedGuide,
} from "@/server/actions/guides";
import { cn } from "cn";

type Props = {
  guides: ListedGuide[];
  isAdmin: boolean;
};

export function GuidePanel({ guides, isAdmin }: Props) {
  const router = useRouter();
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPending, startUploadTransition] = useTransition();
  const [adminPending, startAdminTransition] = useTransition();

  const selected = guides.find((g) => g.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !guides.some((g) => g.id === selectedId)) {
      setSelectedId(null);
    }
  }, [guides, selectedId]);

  function focusUploadForm() {
    uploadFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    document.getElementById("guide-upload-title")?.focus();
  }

  function onUploadSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startUploadTransition(async () => {
      const result = await uploadGuide(fd);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      setUploadTitle("");
      form.reset();
      setSelectedId(result.data.id);
      router.refresh();
    });
  }

  function onDeleteSelected() {
    if (!selected) return;
    if (!window.confirm(`Hapus petunjuk "${selected.title}"?`)) return;
    startAdminTransition(async () => {
      const result = await deleteGuide({ id: selected.id });
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      setSelectedId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <form
          ref={uploadFormRef}
          onSubmit={onUploadSubmit}
          className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-5"
        >
          <h2 className="text-base font-medium text-[var(--text,#1f2933)]">
            Unggah petunjuk PDF
          </h2>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="guide-upload-title">Judul</Label>
              <Input
                id="guide-upload-title"
                name="title"
                required
                maxLength={200}
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                disabled={uploadPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guide-upload-file">File PDF</Label>
              <Input
                id="guide-upload-file"
                name="file"
                type="file"
                required
                accept=".pdf,application/pdf"
                disabled={uploadPending}
                className="min-h-11 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-soft,#e6f2ee)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--text,#1f2933)]"
              />
            </div>
          </div>
          {uploadError ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {uploadError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            disabled={uploadPending}
          >
            {uploadPending ? "Mengunggah…" : "Unggah petunjuk"}
          </Button>
        </form>
      ) : null}

      {guides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
            Belum ada petunjuk.
          </p>
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 w-full sm:w-auto"
              onClick={focusUploadForm}
            >
              Unggah petunjuk pertama
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(12rem,16rem)_1fr] md:gap-6">
          <nav
            className="flex flex-col gap-1"
            aria-label="Daftar petunjuk"
          >
            {guides.map((guide) => {
              const isSelected = selectedId === guide.id;
              return (
                <Button
                  key={guide.id}
                  type="button"
                  variant={isSelected ? "secondary" : "ghost"}
                  className={cn(
                    "min-h-11 h-auto w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left font-normal",
                    isSelected &&
                      "ring-1 ring-[var(--cermin-border,#d9e2ec)]",
                  )}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => setSelectedId(guide.id)}
                >
                  <span className="flex-1">{guide.title}</span>
                  {isAdmin && !guide.isPublished ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-[var(--cermin-border,#d9e2ec)] text-[var(--cermin-muted,#5c6b73)]"
                    >
                      Draft
                    </Badge>
                  ) : null}
                </Button>
              );
            })}
          </nav>

          <div
            className={cn(
              "min-w-0",
              selected ? "block" : "hidden md:block",
            )}
          >
            {selected ? (
              <GuidePreview
                guide={selected}
                isAdmin={isAdmin}
                adminDisabled={adminPending}
                onDelete={onDeleteSelected}
                onMetaUpdated={() => router.refresh()}
              />
            ) : (
              <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-8">
                <p className="text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
                  Pilih petunjuk dari daftar untuk pratinjau.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GuidePreview({
  guide,
  isAdmin,
  adminDisabled,
  onDelete,
  onMetaUpdated,
}: {
  guide: ListedGuide;
  isAdmin: boolean;
  adminDisabled: boolean;
  onDelete: () => void;
  onMetaUpdated: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState(guide.title);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaPending, startMetaTransition] = useTransition();

  useEffect(() => {
    setTitleDraft(guide.title);
    setMetaError(null);
  }, [guide.id, guide.title]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setLoadError(null);
    setUrl(null);

    void (async () => {
      try {
        const res = await fetch(`/api/guides/${guide.id}`, {
          signal: ac.signal,
        });
        const body = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          setLoadError(body.error ?? "Gagal memuat petunjuk");
          setLoading(false);
          return;
        }
        if (!body.url) {
          setLoadError("Gagal memuat petunjuk");
          setLoading(false);
          return;
        }
        setUrl(body.url);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError("Gagal memuat petunjuk");
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [guide.id]);

  function onSaveTitle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (titleDraft.trim() === guide.title) return;
    setMetaError(null);
    startMetaTransition(async () => {
      const result = await updateGuideMeta({
        id: guide.id,
        title: titleDraft,
      });
      if (!result.ok) {
        setMetaError(result.error);
        return;
      }
      onMetaUpdated();
    });
  }

  const titleDirty = titleDraft.trim() !== guide.title;
  const formDisabled = adminDisabled || metaPending;

  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-5"
      aria-labelledby={`guide-preview-${guide.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h3
            id={`guide-preview-${guide.id}`}
            className="text-base font-medium text-[var(--text,#1f2933)]"
          >
            {guide.title}
          </h3>
          <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
            {guide.originalFileName}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 text-sm font-medium text-[var(--cermin-accent,#3d7c6b)] transition-colors hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus,#0b6e4f)]"
            >
              Unduh
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] px-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Unduh
            </span>
          )}
          {isAdmin ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 w-full sm:w-auto"
              disabled={adminDisabled}
              onClick={onDelete}
            >
              Hapus
            </Button>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <form
          onSubmit={onSaveTitle}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor={`guide-title-${guide.id}`}>Judul tampilan</Label>
            <Input
              id={`guide-title-${guide.id}`}
              value={titleDraft}
              maxLength={200}
              disabled={formDisabled}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={formDisabled || !titleDirty}
          >
            {metaPending ? "Menyimpan…" : "Simpan judul"}
          </Button>
          {metaError ? (
            <p
              className="w-full text-sm text-[var(--danger,#9b2c2c)] sm:basis-full"
              role="alert"
            >
              {metaError}
            </p>
          ) : null}
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Memuat pratinjau…
        </p>
      ) : loadError ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {loadError}
        </p>
      ) : url ? (
        <iframe
          title={guide.title}
          src={url}
          className="h-[min(70vh,40rem)] w-full rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
        />
      ) : null}
    </section>
  );
}
