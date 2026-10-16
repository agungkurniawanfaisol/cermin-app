"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStudent } from "@/server/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EditStudentProfileFormProps = {
  student: {
    id: string;
    displayName: string;
    fullName: string | null;
    dateOfBirth: Date | null;
    homeAddress: string | null;
    rt: string | null;
    rw: string | null;
    phone: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    homeLanguage: string | null;
    preferQuiet: boolean;
    preferDimLight: boolean;
    sensoryNotes: string | null;
    requirePhotoForSession: boolean;
    allergies?: string | null;
    adminNotes?: string | null;
  };
};

function toDateInput(value: Date | null): string {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function EditStudentProfileForm({ student }: EditStudentProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(student.fullName ?? "");
  const [displayName, setDisplayName] = useState(student.displayName);
  const [dateOfBirth, setDateOfBirth] = useState(toDateInput(student.dateOfBirth));
  const [homeAddress, setHomeAddress] = useState(student.homeAddress ?? "");
  const [rt, setRt] = useState(student.rt ?? "");
  const [rw, setRw] = useState(student.rw ?? "");
  const [phone, setPhone] = useState(student.phone ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    student.emergencyContactName ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    student.emergencyContactPhone ?? "",
  );
  const [homeLanguage, setHomeLanguage] = useState(student.homeLanguage ?? "");
  const [preferQuiet, setPreferQuiet] = useState(student.preferQuiet);
  const [preferDimLight, setPreferDimLight] = useState(student.preferDimLight);
  const [sensoryNotes, setSensoryNotes] = useState(student.sensoryNotes ?? "");
  const [requirePhotoForSession, setRequirePhotoForSession] = useState(
    student.requirePhotoForSession,
  );
  const [allergies, setAllergies] = useState(student.allergies ?? "");
  const [adminNotes, setAdminNotes] = useState(student.adminNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateStudent({
        id: student.id,
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
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Profil disimpan.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-full-name">Nama lengkap</Label>
        <Input
          id="edit-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={pending}
          maxLength={160}
        />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-display-name">Nama panggilan</Label>
        <Input
          id="edit-display-name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-dob">Tanggal lahir</Label>
        <Input
          id="edit-dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-phone">Nomor telepon</Label>
        <Input
          id="edit-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={pending}
          maxLength={32}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="edit-address">Alamat rumah</Label>
        <Textarea
          id="edit-address"
          rows={2}
          value={homeAddress}
          onChange={(e) => setHomeAddress(e.target.value)}
          disabled={pending}
          maxLength={300}
        />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-rt">RT</Label>
        <Input
          id="edit-rt"
          value={rt}
          onChange={(e) => setRt(e.target.value)}
          disabled={pending}
          maxLength={10}
        />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-rw">RW</Label>
        <Input
          id="edit-rw"
          value={rw}
          onChange={(e) => setRw(e.target.value)}
          disabled={pending}
          maxLength={10}
        />
      </div>

      <fieldset className="sm:col-span-2 grid gap-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/50 p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-[var(--text,#1f2933)]">
          Kontak darurat
        </legend>
        <div className="space-y-2">
          <Label htmlFor="edit-emergency-name">Nama kontak darurat</Label>
          <Input
            id="edit-emergency-name"
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            disabled={pending}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-emergency-phone">Telepon darurat</Label>
          <Input
            id="edit-emergency-phone"
            type="tel"
            inputMode="tel"
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
            disabled={pending}
            maxLength={32}
          />
        </div>
      </fieldset>

      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="edit-language">Bahasa di rumah</Label>
        <Input
          id="edit-language"
          value={homeLanguage}
          onChange={(e) => setHomeLanguage(e.target.value)}
          placeholder="mis. Indonesia, Sunda"
          disabled={pending}
          maxLength={80}
        />
      </div>

      <fieldset className="sm:col-span-2 space-y-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/50 p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--text,#1f2933)]">
          Preferensi sensorik
        </legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--text,#1f2933)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--cermin-accent,#3d7c6b)]"
            checked={preferQuiet}
            onChange={(e) => setPreferQuiet(e.target.checked)}
            disabled={pending}
          />
          Lebih nyaman di lingkungan tenang (suara pelan)
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--text,#1f2933)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--cermin-accent,#3d7c6b)]"
            checked={preferDimLight}
            onChange={(e) => setPreferDimLight(e.target.checked)}
            disabled={pending}
          />
          Lebih nyaman dengan cahaya redup
        </label>
        <div className="space-y-2">
          <Label htmlFor="edit-sensory-notes">Catatan sensorik</Label>
          <Textarea
            id="edit-sensory-notes"
            rows={2}
            value={sensoryNotes}
            onChange={(e) => setSensoryNotes(e.target.value)}
            placeholder="mis. hindari musik latar, sensitif lampu neon"
            disabled={pending}
            maxLength={1000}
          />
        </div>
      </fieldset>

      <label className="sm:col-span-2 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] p-3 text-sm text-[var(--text,#1f2933)]">
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
            Jika aktif, sesi belajar tidak bisa dimulai tanpa foto profil murid.
          </span>
        </span>
      </label>

      {student.allergies !== undefined ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-allergies">Alergi / catatan medis (admin)</Label>
          <Textarea
            id="edit-allergies"
            rows={2}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            disabled={pending}
            maxLength={1000}
          />
        </div>
      ) : null}

      {student.adminNotes !== undefined ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-notes">Catatan admin</Label>
          <Textarea
            id="edit-notes"
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={pending}
            maxLength={2000}
          />
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5" aria-live="polite">
          {message ? (
            <p className="text-sm text-[var(--success,#2f6f4e)]" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          className="min-h-11 w-full cursor-pointer sm:w-auto"
          disabled={pending}
        >
          {pending ? "Menyimpan…" : "Simpan profil"}
        </Button>
      </div>
    </form>
  );
}
