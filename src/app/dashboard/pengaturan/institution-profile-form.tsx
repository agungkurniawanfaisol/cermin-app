"use client";

import { useState, useTransition } from "react";
import { updateInstitutionProfile } from "@/server/actions/branding";
import type { BrandingPublic } from "@/lib/branding-public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  initial: Pick<
    BrandingPublic,
    | "name"
    | "address"
    | "websiteUrl"
    | "instagramUrl"
    | "facebookUrl"
    | "youtubeUrl"
    | "whatsappUrl"
  >;
};

export function InstitutionProfileForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      address: String(fd.get("address") ?? ""),
      websiteUrl: String(fd.get("websiteUrl") ?? ""),
      instagramUrl: String(fd.get("instagramUrl") ?? ""),
      facebookUrl: String(fd.get("facebookUrl") ?? ""),
      youtubeUrl: String(fd.get("youtubeUrl") ?? ""),
      whatsappUrl: String(fd.get("whatsappUrl") ?? ""),
    };
    startTransition(async () => {
      const result = await updateInstitutionProfile(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <section
      className="w-full space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-6"
      aria-labelledby="institution-profile-heading"
    >
      <div>
        <h2
          id="institution-profile-heading"
          className="text-lg font-semibold text-[var(--text,#1f2933)]"
        >
          Profil & footer lembaga
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Nama, alamat, dan tautan media sosial tampil di footer beranda publik.
          Kosongkan field yang tidak dipakai.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="institution-name">Nama lembaga</Label>
          <Input
            id="institution-name"
            name="name"
            defaultValue={initial.name ?? ""}
            maxLength={200}
            autoComplete="organization"
            placeholder="Contoh: Klinik Terapi Cerita"
            className="min-h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="institution-address">Alamat</Label>
          <Textarea
            id="institution-address"
            name="address"
            defaultValue={initial.address ?? ""}
            maxLength={1000}
            rows={3}
            placeholder="Jalan, kelurahan, kota, kode pos"
            className="min-h-[5.5rem] resize-y"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="institution-website">Situs web</Label>
            <Input
              id="institution-website"
              name="websiteUrl"
              type="url"
              inputMode="url"
              defaultValue={initial.websiteUrl ?? ""}
              placeholder="https://…"
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution-instagram">Instagram</Label>
            <Input
              id="institution-instagram"
              name="instagramUrl"
              type="url"
              inputMode="url"
              defaultValue={initial.instagramUrl ?? ""}
              placeholder="https://instagram.com/…"
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution-facebook">Facebook</Label>
            <Input
              id="institution-facebook"
              name="facebookUrl"
              type="url"
              inputMode="url"
              defaultValue={initial.facebookUrl ?? ""}
              placeholder="https://facebook.com/…"
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution-youtube">YouTube</Label>
            <Input
              id="institution-youtube"
              name="youtubeUrl"
              type="url"
              inputMode="url"
              defaultValue={initial.youtubeUrl ?? ""}
              placeholder="https://youtube.com/…"
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution-whatsapp">WhatsApp</Label>
            <Input
              id="institution-whatsapp"
              name="whatsappUrl"
              defaultValue={initial.whatsappUrl ?? ""}
              placeholder="https://wa.me/62812… atau +62812…"
              className="min-h-11"
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5" aria-live="polite">
            {error ? (
              <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
                {error}
              </p>
            ) : null}
            {saved ? (
              <p
                className="text-sm text-[var(--success,#2f6f4e)]"
                role="status"
              >
                Profil footer disimpan.
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full cursor-pointer sm:w-auto"
          >
            {pending ? "Menyimpan…" : "Simpan profil footer"}
          </Button>
        </div>
      </form>
    </section>
  );
}
