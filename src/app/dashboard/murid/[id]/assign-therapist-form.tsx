"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTherapist } from "@/server/actions/assignments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type TherapistOption = { id: string; name: string; email: string };

export function AssignTherapistForm({
  studentId,
  therapists,
}: {
  studentId: string;
  therapists: TherapistOption[];
}) {
  const router = useRouter();
  const [therapistId, setTherapistId] = useState(therapists[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!therapistId) {
      setError("Pilih terapis");
      return;
    }
    startTransition(async () => {
      const result = await assignTherapist({ studentId, therapistId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (therapists.length === 0) {
    return (
      <p className="text-sm text-[var(--muted,#5c6b73)]">
        Belum ada terapis aktif. Undang terapis di halaman Pengguna.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 flex-1 space-y-2 sm:min-w-[12rem]">
        <Label htmlFor="assign-therapist">Terapis</Label>
        <select
          id="assign-therapist"
          className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          value={therapistId}
          onChange={(e) => setTherapistId(e.target.value)}
          disabled={pending}
        >
          {therapists.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.email})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Menugaskan…" : "Tugaskan"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
