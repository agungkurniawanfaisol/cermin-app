"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createStudent } from "@/server/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ParentOption = { id: string; name: string; email: string };

export function CreateStudentForm({ parents }: { parents: ParentOption[] }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [homeLanguage, setHomeLanguage] = useState("");
  const [preferQuiet, setPreferQuiet] = useState(false);
  const [preferDimLight, setPreferDimLight] = useState(false);
  const [sensoryNotes, setSensoryNotes] = useState("");
  const [requirePhotoForSession, setRequirePhotoForSession] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [parentId, setParentId] = useState("");
  const [relationLabel, setRelationLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setFullName("");
    setDisplayName("");
    setDateOfBirth("");
    setHomeAddress("");
    setRt("");
    setRw("");
    setPhone("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setHomeLanguage("");
    setPreferQuiet(false);
    setPreferDimLight(false);
    setSensoryNotes("");
    setRequirePhotoForSession(false);
    setAllergies("");
    setAdminNotes("");
    setParentId("");
    setRelationLabel("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStudent({
        fullName: fullName || undefined,
        displayName,
        dateOfBirth: dateOfBirth || undefined,
        homeAddress: homeAddress || undefined,
        rt: rt || undefined,
        rw: rw || undefined,
        phone: phone || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        homeLanguage: homeLanguage || undefined,
        preferQuiet,
        preferDimLight,
        sensoryNotes: sensoryNotes || undefined,
        requirePhotoForSession,
        allergies: allergies || undefined,
        adminNotes: adminNotes || undefined,
        parentId: parentId || undefined,
        relationLabel: relationLabel || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resetForm();
      router.push(`/dashboard/murid/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
        Foto profil diunggah di halaman detail setelah murid dibuat.
      </p>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="student-full-name">Nama lengkap</Label>
          <Input
            id="student-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Sesuai dokumen / akta"
            disabled={pending}
            maxLength={160}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-name">Nama panggilan</Label>
          <Input
            id="student-name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dipakai di daftar & mode anak"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-dob">Tanggal lahir (opsional)</Label>
          <Input
            id="student-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-phone">Nomor telepon</Label>
          <Input
            id="student-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08… / +62…"
            disabled={pending}
            maxLength={32}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-address">Alamat rumah</Label>
          <Textarea
            id="student-address"
            rows={2}
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
            disabled={pending}
            maxLength={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-rt">RT</Label>
          <Input
            id="student-rt"
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            disabled={pending}
            maxLength={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-rw">RW</Label>
          <Input
            id="student-rw"
            value={rw}
            onChange={(e) => setRw(e.target.value)}
            disabled={pending}
            maxLength={10}
          />
        </div>

        <fieldset className="sm:col-span-2 grid gap-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/60 p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-[var(--text,#1f2933)]">
            Kontak darurat
          </legend>
          <div className="space-y-2">
            <Label htmlFor="student-emergency-name">Nama kontak darurat</Label>
            <Input
              id="student-emergency-name"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              disabled={pending}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-emergency-phone">Telepon darurat</Label>
            <Input
              id="student-emergency-phone"
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              disabled={pending}
              maxLength={32}
            />
          </div>
        </fieldset>

        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="student-language">Bahasa di rumah</Label>
          <Input
            id="student-language"
            value={homeLanguage}
            onChange={(e) => setHomeLanguage(e.target.value)}
            placeholder="mis. Indonesia, Sunda"
            disabled={pending}
            maxLength={80}
          />
        </div>

        <fieldset className="sm:col-span-2 space-y-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/60 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--text,#1f2933)]">
            Preferensi sensorik
          </legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cermin-accent,#3d7c6b)]"
              checked={preferQuiet}
              onChange={(e) => setPreferQuiet(e.target.checked)}
              disabled={pending}
            />
            Lingkungan tenang (suara pelan)
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cermin-accent,#3d7c6b)]"
              checked={preferDimLight}
              onChange={(e) => setPreferDimLight(e.target.checked)}
              disabled={pending}
            />
            Cahaya redup
          </label>
          <div className="space-y-2">
            <Label htmlFor="student-sensory">Catatan sensorik</Label>
            <Textarea
              id="student-sensory"
              rows={2}
              value={sensoryNotes}
              onChange={(e) => setSensoryNotes(e.target.value)}
              disabled={pending}
              maxLength={1000}
            />
          </div>
        </fieldset>

        <label className="sm:col-span-2 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--cermin-accent,#3d7c6b)]"
            checked={requirePhotoForSession}
            onChange={(e) => setRequirePhotoForSession(e.target.checked)}
            disabled={pending}
          />
          <span>
            <span className="font-medium">Wajibkan foto sebelum sesi</span>
            <span className="mt-0.5 block text-[var(--cermin-muted,#5c6b73)]">
              Sesi tidak bisa dimulai tanpa foto profil.
            </span>
          </span>
        </label>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-allergies">Alergi / catatan medis (admin)</Label>
          <Textarea
            id="student-allergies"
            rows={2}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            disabled={pending}
            maxLength={1000}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-notes">Catatan admin (opsional)</Label>
          <Textarea
            id="student-notes"
            rows={3}
            maxLength={2000}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={pending}
          />
        </div>

        <fieldset className="sm:col-span-2 space-y-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/60 p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--text,#1f2933)]">
            Tautkan orang tua (opsional)
          </legend>
          <p className="text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
            Undang akun ortu dulu di{" "}
            <Link
              href="/dashboard/pengguna"
              className="font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
            >
              Pengguna
            </Link>{" "}
            jika belum ada.
          </p>
          {parents.length === 0 ? (
            <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
              Belum ada orang tua aktif.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-parent">Orang tua</Label>
                <select
                  id="student-parent"
                  className="flex min-h-11 w-full cursor-pointer rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] disabled:opacity-50"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={pending}
                >
                  <option value="">— Tidak ditautkan dulu —</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-relation">Hubungan (opsional)</Label>
                <Input
                  id="student-relation"
                  value={relationLabel}
                  onChange={(e) => setRelationLabel(e.target.value)}
                  placeholder="mis. Ibu, Ayah, Wali"
                  disabled={pending || !parentId}
                  maxLength={80}
                />
              </div>
            </div>
          )}
        </fieldset>

        <div className="flex w-full flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            className="min-h-11 w-full cursor-pointer sm:w-auto"
            disabled={pending}
          >
            {pending ? "Menyimpan…" : "Tambah murid"}
          </Button>
        </div>
      </form>
      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
