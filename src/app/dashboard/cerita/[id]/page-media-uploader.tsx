"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { deleteMedia, uploadMedia } from "@/server/actions/media";
import { compressImage } from "@/lib/image-compress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

export type PageMediaItem = {
  id: string;
  kind: string;
  mimeType: string;
  altText: string | null;
  sortOrder: number;
  studentId: string | null;
  student: { id: string; displayName: string } | null;
};

export type StudentOption = { id: string; displayName: string };

export type UploadedMediaPayload = {
  id: string;
  kind: string;
  mimeType: string;
  altText: string | null;
  sortOrder: number;
  studentId: string | null;
};

export type PageMediaUploaderHandle = {
  /**
   * Unggah semua file pending (foto per murid + ilustrasi/audio umum).
   * No-op jika kosong. Replace personalisasi = hapus lama lalu unggah baru.
   * Mengembalikan daftar media halaman terbaru agar parent bisa sync state.
   */
  uploadPending: () => Promise<
    | { error: string; media?: undefined }
    | {
        error: null;
        uploaded: UploadedMediaPayload[];
        media: PageMediaItem[];
      }
  >;
};

export type MediaFocusSection = "portrait" | "illustration" | "extra";

type PortraitPending = {
  altText: string;
  fileName: string;
  /** File di state — jangan andalkan input DOM (bisa hilang saat remount). */
  file: File | null;
  previewUrl: string | null;
};

async function fetchSignedMediaUrl(mediaId: string): Promise<string> {
  const res = await fetch(`/api/media/${mediaId}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new Error(body.error ?? "Gagal memuat pratinjau");
  }
  return body.url;
}

function MediaPreview({
  item,
  compact,
  localSrc,
}: {
  item?: PageMediaItem | null;
  compact?: boolean;
  /** Pratinjau lokal (object URL) sebelum / sesaat setelah unggah. */
  localSrc?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(localSrc ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localSrc) {
      setUrl(localSrc);
      setError(null);
      return;
    }

    if (!item?.id) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    setUrl(null);
    setError(null);

    void (async () => {
      try {
        const signed = await fetchSignedMediaUrl(item.id);
        if (!cancelled) setUrl(signed);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat pratinjau",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id, localSrc]);

  const imgClass = compact
    ? "h-full w-full object-cover"
    : "max-h-40 w-full rounded-lg border border-[var(--border,#d9e2ec)] object-contain";

  if (error && !url) {
    return (
      <p className="px-1 text-center text-xs text-[var(--cermin-muted,#5c6b73)]" role="status">
        {error}
      </p>
    );
  }

  if (!url) {
    return (
      <p className="px-1 text-center text-xs text-[var(--cermin-muted,#5c6b73)]" role="status">
        Memuat media…
      </p>
    );
  }

  if (item?.kind === "AUDIO") {
    return <audio controls src={url} className="w-full" preload="none" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL / blob lokal
    <img
      src={url}
      alt={item?.altText ?? "Media cerita"}
      className={imgClass}
      onError={() => {
        if (localSrc || !item?.id) {
          setError("Gagal memuat pratinjau");
          return;
        }
        void fetchSignedMediaUrl(item.id)
          .then((fresh) => {
            setUrl(fresh);
            setError(null);
          })
          .catch(() => setError("Gagal memuat pratinjau"));
      }}
    />
  );
}

function portraitInputId(pageId: string, studentId: string) {
  return `file-portrait-${pageId}-${studentId}`;
}

function storyImageInputId(pageId: string) {
  return `file-story-image-${pageId}`;
}

function storyAudioInputId(pageId: string) {
  return `file-story-audio-${pageId}`;
}

function storyExtraImageInputId(pageId: string) {
  return `file-story-extra-image-${pageId}`;
}

async function uploadSharedFile(opts: {
  storyId: string;
  pageId: string;
  kind: "IMAGE" | "AUDIO";
  rawFile: File;
  altText: string;
}): Promise<
  | { ok: true; data: UploadedMediaPayload }
  | { ok: false; error: string }
> {
  if (opts.kind === "IMAGE" && !opts.altText.trim()) {
    return { ok: false, error: "Teks alternatif wajib diisi untuk ilustrasi" };
  }

  const file =
    opts.kind === "IMAGE" ? await compressImage(opts.rawFile) : opts.rawFile;
  const formData = new FormData();
  formData.set("file", file);
  formData.set("storyId", opts.storyId);
  formData.set("pageId", opts.pageId);
  formData.set("kind", opts.kind);
  if (opts.kind === "IMAGE") {
    formData.set("altText", opts.altText.trim());
  }

  const result = await uploadMedia(formData);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

function toMediaItem(
  data: UploadedMediaPayload,
  student: { id: string; displayName: string } | null,
): PageMediaItem {
  return {
    id: data.id,
    kind: data.kind,
    mimeType: data.mimeType,
    altText: data.altText,
    sortOrder: data.sortOrder,
    studentId: data.studentId,
    student,
  };
}

export const PageMediaUploader = forwardRef<
  PageMediaUploaderHandle,
  {
    storyId: string;
    pageId: string;
    media: PageMediaItem[];
    students: StudentOption[];
    readOnly: boolean;
    focusSection: MediaFocusSection;
    onMediaChange?: (media: PageMediaItem[]) => void;
  }
>(function PageMediaUploader(
  {
    storyId,
    pageId,
    media,
    students,
    readOnly,
    focusSection,
    onMediaChange,
  },
  ref,
) {
  const [portraitPending, setPortraitPending] = useState<
    Record<string, PortraitPending>
  >({});
  const [imageAlt, setImageAlt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [extraAlt, setExtraAlt] = useState("");
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [extraPreviewUrl, setExtraPreviewUrl] = useState<string | null>(null);
  const [extraFileName, setExtraFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mediaRef = useRef(media);
  const studentsRef = useRef(students);
  const portraitPendingRef = useRef(portraitPending);
  const imageAltRef = useRef(imageAlt);
  const extraAltRef = useRef(extraAlt);
  const imageFileRef = useRef(imageFile);
  const audioFileRef = useRef(audioFile);
  const extraFileRef = useRef(extraFile);
  mediaRef.current = media;
  studentsRef.current = students;
  portraitPendingRef.current = portraitPending;
  imageAltRef.current = imageAlt;
  extraAltRef.current = extraAlt;
  imageFileRef.current = imageFile;
  audioFileRef.current = audioFile;
  extraFileRef.current = extraFile;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (extraPreviewUrl) URL.revokeObjectURL(extraPreviewUrl);
      for (const p of Object.values(portraitPendingRef.current)) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    };
    // Hanya unmount — revoke URL di handler saat diganti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portraitByStudent = useMemo(() => {
    const map = new Map<string, PageMediaItem>();
    for (const m of media) {
      if (m.kind === "IMAGE" && m.studentId) {
        map.set(m.studentId, m);
      }
    }
    return map;
  }, [media]);

  const storyImages = useMemo(
    () => media.filter((m) => m.studentId == null && m.kind === "IMAGE"),
    [media],
  );
  const storyAudios = useMemo(
    () => media.filter((m) => m.studentId == null && m.kind === "AUDIO"),
    [media],
  );

  const withPhotoCount = students.filter((s) =>
    portraitByStudent.has(s.id),
  ).length;

  useImperativeHandle(ref, () => ({
    async uploadPending() {
      setError(null);
      const uploaded: UploadedMediaPayload[] = [];
      let workingMedia = [...mediaRef.current];
      const studentList = studentsRef.current;
      const pendingMap = portraitPendingRef.current;

      const portraitJobs = studentList.filter(
        (s) => pendingMap[s.id]?.file != null,
      );

      for (const student of portraitJobs) {
        const pendingMeta = pendingMap[student.id];
        const rawFile = pendingMeta?.file ?? null;
        if (!rawFile) continue;

        const existing = workingMedia.find(
          (m) => m.kind === "IMAGE" && m.studentId === student.id,
        );
        const alt =
          pendingMeta?.altText?.trim() || (existing?.altText ?? "").trim();

        if (!alt) {
          const msg = `Teks alternatif wajib untuk foto ${student.displayName}`;
          setError(msg);
          return { error: msg };
        }

        if (existing) {
          const del = await deleteMedia(existing.id);
          if (!del.ok) {
            setError(del.error);
            return { error: del.error };
          }
          workingMedia = workingMedia.filter((m) => m.id !== existing.id);
        }

        const file = await compressImage(rawFile);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("storyId", storyId);
        formData.set("pageId", pageId);
        formData.set("kind", "IMAGE");
        formData.set("altText", alt);
        formData.set("studentId", student.id);

        const result = await uploadMedia(formData);
        if (!result.ok) {
          setError(result.error);
          onMediaChange?.(workingMedia);
          return { error: result.error };
        }

        uploaded.push(result.data);
        workingMedia = [
          ...workingMedia,
          toMediaItem(result.data, {
            id: student.id,
            displayName: student.displayName,
          }),
        ];

        const input = document.getElementById(
          portraitInputId(pageId, student.id),
        );
        if (input instanceof HTMLInputElement) input.value = "";
      }

      const sharedJobs: Array<{
        file: File | null;
        kind: "IMAGE" | "AUDIO";
        alt: string;
        inputId: string;
        clear: () => void;
      }> = [
        {
          file: imageFileRef.current,
          kind: "IMAGE",
          alt: imageAltRef.current,
          inputId: storyImageInputId(pageId),
          clear: () => {
            setImageAlt("");
            setImageFileName("");
            setImageFile(null);
            setImagePreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          },
        },
        {
          file: extraFileRef.current,
          kind: "IMAGE",
          alt: extraAltRef.current,
          inputId: storyExtraImageInputId(pageId),
          clear: () => {
            setExtraAlt("");
            setExtraFileName("");
            setExtraFile(null);
            setExtraPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          },
        },
        {
          file: audioFileRef.current,
          kind: "AUDIO",
          alt: "",
          inputId: storyAudioInputId(pageId),
          clear: () => {
            setAudioFileName("");
            setAudioFile(null);
          },
        },
      ];

      for (const job of sharedJobs) {
        if (!job.file) continue;

        const result = await uploadSharedFile({
          storyId,
          pageId,
          kind: job.kind,
          rawFile: job.file,
          altText: job.alt,
        });
        if (!result.ok) {
          setError(result.error);
          onMediaChange?.(workingMedia);
          return { error: result.error };
        }

        uploaded.push(result.data);
        workingMedia = [...workingMedia, toMediaItem(result.data, null)];
        const input = document.getElementById(job.inputId);
        if (input instanceof HTMLInputElement) input.value = "";
        job.clear();
      }

      if (uploaded.length > 0) {
        onMediaChange?.(workingMedia);
        setPortraitPending((prev) => {
          for (const p of Object.values(prev)) {
            if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          }
          return {};
        });
      }

      return { error: null, uploaded, media: workingMedia };
    },
  }));

  function handleDelete(mediaId: string) {
    if (!window.confirm("Hapus media ini dari halaman cerita?")) {
      return;
    }
    setError(null);
    setDeletingId(mediaId);
    startTransition(async () => {
      try {
        const res = await deleteMedia(mediaId);
        if (!res.ok) {
          setError(res.error);
        } else {
          onMediaChange?.(media.filter((m) => m.id !== mediaId));
        }
      } finally {
        setDeletingId(null);
      }
    });
  }

  function setPortraitAlt(studentId: string, altText: string) {
    setPortraitPending((prev) => ({
      ...prev,
      [studentId]: {
        altText,
        fileName: prev[studentId]?.fileName ?? "",
        file: prev[studentId]?.file ?? null,
        previewUrl: prev[studentId]?.previewUrl ?? null,
      },
    }));
  }

  function onPortraitFileChange(studentId: string, file: File | null) {
    setPortraitPending((prev) => {
      const previous = prev[studentId];
      if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);

      if (!file) {
        if (!previous) return prev;
        return {
          ...prev,
          [studentId]: {
            ...previous,
            fileName: "",
            file: null,
            previewUrl: null,
          },
        };
      }

      const existing = portraitByStudent.get(studentId);
      return {
        ...prev,
        [studentId]: {
          fileName: file.name,
          altText: previous?.altText || existing?.altText || "",
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
  }

  function onStoryImageFileChange(file: File | null) {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setImageFile(file);
    setImageFileName(file?.name ?? "");
  }

  function onExtraImageFileChange(file: File | null) {
    setExtraPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setExtraFile(file);
    setExtraFileName(file?.name ?? "");
  }

  function onAudioFileChange(file: File | null) {
    setAudioFile(file);
    setAudioFileName(file?.name ?? "");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* —— Foto murid —— */}
      <section
        className={cn(
          "flex flex-col gap-4",
          focusSection !== "portrait" && "hidden",
        )}
        aria-labelledby={`portrait-h-${pageId}`}
        aria-hidden={focusSection !== "portrait"}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h3
                  id={`portrait-h-${pageId}`}
                  className="text-sm font-semibold text-[var(--text,#1f2933)]"
                >
                  Foto murid
                </h3>
                <p className="mt-0.5 text-xs text-[var(--cermin-muted,#5c6b73)]">
                  Satu murid satu foto. Unggah ikut Simpan halaman.
                </p>
              </div>
              {students.length > 0 ? (
                <p className="shrink-0 text-xs font-medium text-[var(--text,#1f2933)]">
                  Sudah{" "}
                  <span className="text-[var(--cermin-accent,#3d7c6b)]">
                    {withPhotoCount}
                  </span>{" "}
                  dari {students.length}
                </p>
              ) : null}
            </div>

            {students.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-3 py-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
                Tidak ada murid aktif untuk personalisasi.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {students.map((student) => {
                  const existing = portraitByStudent.get(student.id) ?? null;
                  const pendingMeta = portraitPending[student.id];
                  const inputId = portraitInputId(pageId, student.id);
                  const altId = `alt-portrait-${pageId}-${student.id}`;
                  const hasPhoto = Boolean(existing);
                  const altValue =
                    pendingMeta?.altText ?? existing?.altText ?? "";

                  return (
                    <li
                      key={student.id}
                      className="cermin-hover-card flex flex-col gap-3 rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] p-3 sm:p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text,#1f2933)]">
                          {student.displayName}
                        </p>
                        {hasPhoto ? (
                          <Badge className="border-transparent bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)]">
                            Sudah ada foto
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[var(--cermin-muted,#5c6b73)]"
                          >
                            Belum ada foto
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start">
                        <div className="flex aspect-square w-full max-w-[7.5rem] items-center justify-center overflow-hidden rounded-lg border border-[var(--border,#d9e2ec)] bg-white">
                          {pendingMeta?.previewUrl ? (
                            <MediaPreview
                              localSrc={pendingMeta.previewUrl}
                              compact
                            />
                          ) : existing ? (
                            <MediaPreview item={existing} compact />
                          ) : (
                            <span className="px-2 text-center text-xs text-[var(--cermin-muted,#5c6b73)]">
                              Belum ada
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-col gap-3">
                          {existing?.altText ? (
                            <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                              Alt: {existing.altText}
                            </p>
                          ) : null}

                          {!readOnly && existing ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-11"
                                disabled={pending || deletingId === existing.id}
                                onClick={() =>
                                  document.getElementById(inputId)?.click()
                                }
                              >
                                Ganti foto
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 border-red-200 text-[var(--danger,#9b2c2c)] hover:bg-red-50"
                                disabled={pending || deletingId === existing.id}
                                onClick={() => handleDelete(existing.id)}
                              >
                                {deletingId === existing.id
                                  ? "Menghapus…"
                                  : "Hapus"}
                              </Button>
                            </div>
                          ) : null}

                          {!readOnly ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-2">
                                <Label htmlFor={inputId}>
                                  {hasPhoto
                                    ? "File pengganti (opsional)"
                                    : "File foto (opsional)"}
                                </Label>
                                <Input
                                  id={inputId}
                                  type="file"
                                  disabled={pending}
                                  accept="image/jpeg,image/png,image/webp"
                                  className={hasPhoto ? "sr-only" : undefined}
                                  tabIndex={hasPhoto ? -1 : undefined}
                                  onChange={(e) =>
                                    onPortraitFileChange(
                                      student.id,
                                      e.target.files?.[0] ?? null,
                                    )
                                  }
                                />
                                {!hasPhoto ? (
                                  <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                                    JPEG/PNG/WebP — dikompres otomatis, maks. 5
                                    MB
                                  </p>
                                ) : null}
                                {pendingMeta?.fileName ? (
                                  <p className="text-xs text-[var(--cermin-accent,#3d7c6b)]">
                                    Siap diunggah: {pendingMeta.fileName}
                                    {hasPhoto ? " (mengganti foto lama)" : ""}
                                  </p>
                                ) : null}
                              </div>

                              {!hasPhoto || pendingMeta?.fileName ? (
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={altId}>Teks alternatif</Label>
                                  <Input
                                    id={altId}
                                    value={altValue}
                                    onChange={(e) =>
                                      setPortraitAlt(student.id, e.target.value)
                                    }
                                    disabled={pending}
                                    placeholder="Wajib jika ada file dipilih"
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)]/60 p-4 sm:p-5">
            <h4 className="text-sm font-semibold text-[var(--text,#1f2933)]">
              Keterangan
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
              Foto di sini muncul di sisi kiri child mode untuk murid yang
              sedang belajar. Murid tanpa foto tidak menampilkan slot kiri —
              ilustrasi umum tetap tampil di bawah teks.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
              Pilih file per baris, isi teks alternatif, lalu tekan{" "}
              <span className="font-medium text-[var(--text,#1f2933)]">
                Simpan halaman
              </span>
              . Mengganti foto akan menghapus file lama setelah unggah berhasil.
            </p>
          </aside>
        </div>
      </section>

      {/* —— Ilustrasi umum —— */}
      <section
        className={cn(
          "flex flex-col gap-3",
          focusSection !== "illustration" && "hidden",
        )}
        aria-labelledby={`story-img-h-${pageId}`}
        aria-hidden={focusSection !== "illustration"}
      >
        <div>
          <h3
            id={`story-img-h-${pageId}`}
            className="text-sm font-semibold text-[var(--text,#1f2933)]"
          >
            Ilustrasi cerita (umum)
          </h3>
          <p className="mt-0.5 text-xs text-[var(--cermin-muted,#5c6b73)]">
            Gambar bersama untuk semua murid — tampil di bawah teks child mode.
          </p>
        </div>

        {storyImages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-3 py-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Belum ada ilustrasi umum.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {storyImages.map((item) => (
              <li
                key={item.id}
                className="cermin-hover-card flex flex-col gap-2 rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Ilustrasi</Badge>
                    {item.altText ? (
                      <span className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                        {item.altText}
                      </span>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 border-red-200 text-[var(--danger,#9b2c2c)] hover:bg-red-50"
                      disabled={pending || deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id ? "Menghapus…" : "Hapus"}
                    </Button>
                  ) : null}
                </div>
                <MediaPreview item={item} />
              </li>
            ))}
          </ul>
        )}

        {!readOnly ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/80 p-3 sm:p-4">
            <p className="text-sm font-medium text-[var(--text,#1f2933)]">
              Tambah ilustrasi
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor={storyImageInputId(pageId)}>File gambar</Label>
              <Input
                id={storyImageInputId(pageId)}
                type="file"
                disabled={pending}
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  onStoryImageFileChange(e.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                JPEG/PNG/WebP — dikompres otomatis, maks. 5 MB
              </p>
              {imagePreviewUrl ? (
                <div className="overflow-hidden rounded-lg border border-[var(--border,#d9e2ec)] bg-white p-2">
                  <MediaPreview localSrc={imagePreviewUrl} />
                </div>
              ) : null}
              {imageFileName ? (
                <p className="text-xs text-[var(--cermin-accent,#3d7c6b)]">
                  Siap diunggah: {imageFileName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`story-img-alt-${pageId}`}>Teks alternatif</Label>
              <Input
                id={`story-img-alt-${pageId}`}
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                disabled={pending}
                placeholder="Wajib jika mengunggah gambar"
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* —— Audio & tambahan ilustrasi —— */}
      <section
        className={cn(
          "flex flex-col gap-5",
          focusSection !== "extra" && "hidden",
        )}
        aria-labelledby={`story-extra-h-${pageId}`}
        aria-hidden={focusSection !== "extra"}
      >
        <div>
          <h3
            id={`story-extra-h-${pageId}`}
            className="text-sm font-semibold text-[var(--text,#1f2933)]"
          >
            Audio &amp; tambahan ilustrasi
          </h3>
          <p className="mt-0.5 text-xs text-[var(--cermin-muted,#5c6b73)]">
            Audio narasi tanpa autoplay, plus ilustrasi tambahan jika perlu.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-[var(--cermin-muted,#5c6b73)] uppercase">
            Audio narasi
          </h4>
          {storyAudios.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-3 py-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Belum ada audio.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {storyAudios.map((item) => (
                <li
                  key={item.id}
                  className="cermin-hover-card flex flex-col gap-2 rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge className="border-transparent bg-amber-50 text-amber-800">
                      Audio
                    </Badge>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 border-red-200 text-[var(--danger,#9b2c2c)] hover:bg-red-50"
                        disabled={pending || deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                      >
                        {deletingId === item.id ? "Menghapus…" : "Hapus"}
                      </Button>
                    ) : null}
                  </div>
                  <MediaPreview item={item} />
                </li>
              ))}
            </ul>
          )}

          {!readOnly ? (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/80 p-3 sm:p-4">
              <p className="text-sm font-medium text-[var(--text,#1f2933)]">
                Tambah audio
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor={storyAudioInputId(pageId)}>File audio</Label>
                <Input
                  id={storyAudioInputId(pageId)}
                  type="file"
                  disabled={pending}
                  accept="audio/mpeg,audio/wav,audio/ogg"
                  onChange={(e) =>
                    onAudioFileChange(e.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                  MPEG/WAV/OGG, maks. 10 MB — tidak autoplay di child mode
                </p>
                {audioFileName ? (
                  <p className="text-xs text-[var(--cermin-accent,#3d7c6b)]">
                    Siap diunggah: {audioFileName}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border,#d9e2ec)] pt-4">
          <h4 className="text-xs font-semibold tracking-wide text-[var(--cermin-muted,#5c6b73)] uppercase">
            Tambahan ilustrasi
          </h4>
          <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
            Gambar tambahan (selain tab Ilustrasi) — ikut daftar media umum.
          </p>
          {!readOnly ? (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/80 p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={storyExtraImageInputId(pageId)}>
                  File gambar tambahan
                </Label>
                <Input
                  id={storyExtraImageInputId(pageId)}
                  type="file"
                  disabled={pending}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    onExtraImageFileChange(e.target.files?.[0] ?? null)
                  }
                />
                {extraPreviewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-[var(--border,#d9e2ec)] bg-white p-2">
                    <MediaPreview localSrc={extraPreviewUrl} />
                  </div>
                ) : null}
                {extraFileName ? (
                  <p className="text-xs text-[var(--cermin-accent,#3d7c6b)]">
                    Siap diunggah: {extraFileName}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`story-extra-alt-${pageId}`}>
                  Teks alternatif
                </Label>
                <Input
                  id={`story-extra-alt-${pageId}`}
                  value={extraAlt}
                  onChange={(e) => setExtraAlt(e.target.value)}
                  disabled={pending}
                  placeholder="Wajib jika mengunggah gambar"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
              Mode baca — unggah dinonaktifkan.
            </p>
          )}
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
