"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadStudentAvatar } from "@/server/actions/avatars";
import type { StudentPhotoSlot } from "@/lib/avatar-storage";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type StudentAvatarUploaderProps = {
  studentId: string;
  label: string;
  /** Teks singkat di bawah judul, mis. "Opsional". */
  hint?: string;
  /** Inisial / nama untuk fallback avatar. */
  displayName: string;
  slot: StudentPhotoSlot;
  hasImage: boolean;
  canUpload: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function StudentAvatarUploader({
  studentId,
  label,
  hint,
  displayName,
  slot,
  hasImage,
  canUpload,
}: StudentAvatarUploaderProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = hasImage ? fetchedUrl : null;

  useEffect(() => {
    if (!hasImage) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/avatar/student/${studentId}?slot=${slot}`,
        );
        const body = (await res.json()) as { url?: string | null };
        if (!cancelled && res.ok && body.url) setFetchedUrl(body.url);
      } catch {
        /* fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasImage, studentId, slot]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("studentId", studentId);
    formData.set("slot", slot);

    startTransition(async () => {
      const result = await uploadStudentAvatar(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
      try {
        const res = await fetch(
          `/api/avatar/student/${studentId}?slot=${slot}`,
        );
        const body = (await res.json()) as { url?: string | null };
        if (res.ok && body.url) setFetchedUrl(body.url);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text,#1f2933)]">
          {label}
        </p>
        {hint ? (
          <p className="mt-0.5 text-xs text-[var(--cermin-muted,#5c6b73)]">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Avatar size="lg" className="size-20 after:rounded-full">
          {url ? (
            <AvatarImage src={url} alt={`Foto ${label} — ${displayName}`} />
          ) : null}
          <AvatarFallback className="bg-[var(--accent-soft,#e6f2ee)] text-lg font-semibold text-[var(--cermin-accent,#3d7c6b)]">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        {canUpload ? (
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => {
                setError(null);
                fileRef.current?.click();
              }}
            >
              {pending
                ? "Mengunggah…"
                : hasImage
                  ? "Ganti foto"
                  : "Unggah foto"}
            </Button>
            <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
              JPEG, PNG, atau WebP · maks. 2 MB
            </p>
            {error ? (
              <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
            {hasImage ? "Foto tersedia" : "Belum ada foto"}
          </p>
        )}
      </div>
    </div>
  );
}
