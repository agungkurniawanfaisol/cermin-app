"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  removeInstitutionLogo,
  uploadInstitutionLogo,
} from "@/server/actions/branding";
import { brandingLogoSrc } from "@/lib/branding-public";
import { Button } from "@/components/ui/button";

type BrandingFormProps = {
  hasLogo: boolean;
  logoVersion: string | null;
};

export function BrandingForm({ hasLogo, logoVersion }: BrandingFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewVersion, setPreviewVersion] = useState(logoVersion);
  const [showLogo, setShowLogo] = useState(hasLogo);

  function onPick() {
    setError(null);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadInstitutionLogo(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowLogo(true);
      setPreviewVersion(new Date().toISOString());
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeInstitutionLogo();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowLogo(false);
      setPreviewVersion(null);
    });
  }

  return (
    <section
      className="w-full space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-6"
      aria-labelledby="branding-heading"
    >
      <div>
        <h2
          id="branding-heading"
          className="text-lg font-semibold text-[var(--text,#1f2933)]"
        >
          Logo lembaga
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Tampil di beranda publik dan chrome dasbor. JPEG, PNG, atau WebP ·
          maks. 2 MB.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
          {showLogo && previewVersion ? (
            <Image
              src={brandingLogoSrc(previewVersion)}
              alt="Pratinjau logo lembaga"
              fill
              className="object-contain p-1.5"
              unoptimized
            />
          ) : (
            <span className="text-xs font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
              C
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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
            onClick={onPick}
            disabled={pending}
            className="min-h-11 cursor-pointer"
          >
            {pending ? "Menyimpan…" : showLogo ? "Ganti logo" : "Unggah logo"}
          </Button>
          {showLogo ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRemove}
              disabled={pending}
              className="min-h-11 cursor-pointer"
            >
              Hapus logo
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
