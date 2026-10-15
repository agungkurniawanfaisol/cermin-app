"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/server/actions/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PageMediaItem = {
  id: string;
  kind: string;
  mimeType: string;
  altText: string | null;
  sortOrder: number;
};

function MediaPreview({ item }: { item: PageMediaItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/media/${item.id}`);
        const body = (await res.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (!res.ok || !body.url) {
          setError(body.error ?? "Gagal memuat pratinjau");
          return;
        }
        setUrl(body.url);
      } catch {
        if (!cancelled) setError("Gagal memuat pratinjau");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  if (error) {
    return (
      <p className="text-xs text-[var(--muted,#5c6b73)]" role="status">
        {error}
      </p>
    );
  }

  if (!url) {
    return (
      <p className="text-xs text-[var(--muted,#5c6b73)]" role="status">
        Memuat media…
      </p>
    );
  }

  if (item.kind === "AUDIO") {
    return (
      <audio controls src={url} className="w-full" preload="none" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL from private bucket
    <img
      src={url}
      alt={item.altText ?? "Media cerita"}
      className="max-h-40 rounded-lg border border-[var(--border,#d9e2ec)] object-contain"
    />
  );
}

export function PageMediaUploader({
  storyId,
  pageId,
  media,
  readOnly,
}: {
  storyId: string;
  pageId: string;
  media: PageMediaItem[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"IMAGE" | "AUDIO">("IMAGE");
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("storyId", storyId);
    formData.set("pageId", pageId);
    formData.set("kind", kind);
    if (kind === "IMAGE") {
      formData.set("altText", altText.trim());
    }

    startTransition(async () => {
      const result = await uploadMedia(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setAltText("");
      setKind("IMAGE");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4">
      <p className="text-sm font-medium text-[var(--text,#1f2933)]">Media</p>

      {media.length === 0 ? (
        <p className="text-xs text-[var(--muted,#5c6b73)]">Belum ada media.</p>
      ) : (
        <ul className="space-y-3">
          {media.map((item) => (
            <li key={item.id} className="space-y-1">
              <p className="text-xs text-[var(--muted,#5c6b73)]">
                {item.kind === "AUDIO" ? "Audio" : "Gambar"}
                {item.altText ? ` · ${item.altText}` : ""}
              </p>
              <MediaPreview item={item} />
            </li>
          ))}
        </ul>
      )}

      {!readOnly ? (
        <form onSubmit={onSubmit} className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`kind-${pageId}`}>Jenis</Label>
            <select
              id={`kind-${pageId}`}
              value={kind}
              onChange={(e) =>
                setKind(e.target.value === "AUDIO" ? "AUDIO" : "IMAGE")
              }
              disabled={pending}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="IMAGE">Gambar</option>
              <option value="AUDIO">Audio</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`file-${pageId}`}>File</Label>
            <Input
              id={`file-${pageId}`}
              name="file"
              type="file"
              required
              disabled={pending}
              accept={
                kind === "IMAGE"
                  ? "image/jpeg,image/png,image/webp"
                  : "audio/mpeg,audio/wav,audio/ogg"
              }
            />
            <p className="text-xs text-[var(--muted,#5c6b73)]">
              {kind === "IMAGE"
                ? "JPEG/PNG/WebP, maks. 5 MB"
                : "MPEG/WAV/OGG, maks. 10 MB"}
            </p>
          </div>

          {kind === "IMAGE" ? (
            <div className="space-y-2">
              <Label htmlFor={`alt-${pageId}`}>Teks alternatif</Label>
              <Input
                id={`alt-${pageId}`}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                required
                disabled={pending}
                placeholder="Deskripsi singkat untuk aksesibilitas"
              />
            </div>
          ) : null}

          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            disabled={pending}
          >
            {pending ? "Mengunggah…" : "Unggah media"}
          </Button>

          {error ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
