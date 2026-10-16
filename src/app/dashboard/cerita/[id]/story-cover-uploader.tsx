"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia, uploadMedia } from "@/server/actions/media";
import { compressImage } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fileInputClass =
  "h-11 w-full min-w-0 cursor-pointer rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-3 py-2 text-base text-[var(--text,#1f2933)] file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium";

type Props = {
  storyId: string;
  coverMediaId: string | null;
  readOnly: boolean;
};

export function StoryCoverUploader({
  storyId,
  coverMediaId: initialCoverId,
  readOnly,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverMediaId, setCoverMediaId] = useState(initialCoverId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("Gambar utama cerita");
  const [fileName, setFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCoverMediaId(initialCoverId);
  }, [initialCoverId]);

  useEffect(() => {
    if (!coverMediaId) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/media/${coverMediaId}`);
        const body = (await res.json()) as { url?: string };
        if (cancelled) return;
        if (res.ok && body.url) setPreviewUrl(body.url);
        else setPreviewUrl(null);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coverMediaId]);

  function onFileChange(file: File | null) {
    setError(null);
    setMessage(null);
    setPendingFile(file);
    setFileName(file?.name ?? "");
  }

  function onUpload() {
    if (readOnly || !pendingFile || pending) return;
    if (!altText.trim()) {
      setError("Teks alternatif wajib diisi.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const previousId = coverMediaId;
        const file = await compressImage(pendingFile);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("storyId", storyId);
        formData.set("kind", "IMAGE");
        formData.set("altText", altText.trim());
        // Tanpa pageId → MediaAsset story-level (gambar utama).

        const result = await uploadMedia(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }

        if (previousId) {
          const del = await deleteMedia(previousId);
          if (!del.ok) {
            // Cover baru sudah ada; hapus lama gagal — tetap refresh.
            console.error("[StoryCoverUploader] delete old cover:", del.error);
          }
        }

        setCoverMediaId(result.data.id);
        setPendingFile(null);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        setMessage("Gambar utama tersimpan.");
        router.refresh();
      } catch {
        setError("Gagal mengunggah gambar utama.");
      }
    });
  }

  function onRemove() {
    if (readOnly || !coverMediaId || pending) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const del = await deleteMedia(coverMediaId);
      if (!del.ok) {
        setError(del.error);
        return;
      }
      setCoverMediaId(null);
      setPreviewUrl(null);
      setMessage("Gambar utama dihapus.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Gambar utama
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Tampil di kartu pilih cerita saat mulai sesi. Gunakan gambar tenang,
          kontras jelas, tanpa teks kecil yang sulit dibaca.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)]/40">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL
          <img
            src={previewUrl}
            alt={altText || "Gambar utama cerita"}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center px-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Belum ada gambar utama
          </div>
        )}
      </div>

      {!readOnly ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cover-file">File gambar</Label>
            <input
              id="cover-file"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending}
              className={fileInputClass}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            {fileName ? (
              <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                Dipilih: {fileName}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cover-alt">Teks alternatif</Label>
            <Input
              id="cover-alt"
              value={altText}
              disabled={pending}
              onChange={(e) => setAltText(e.target.value)}
              className="min-h-11"
              placeholder="Mis. Anak menunggu giliran di ayunan"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={pending || !pendingFile}
              onClick={onUpload}
            >
              {pending ? "Menyimpan…" : "Unggah gambar utama"}
            </Button>
            {coverMediaId ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={pending}
                onClick={onRemove}
              >
                Hapus gambar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--success,#2f6f4e)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
