"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStudent } from "@/server/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateStudentForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStudent({
        displayName,
        dateOfBirth: dateOfBirth || undefined,
        adminNotes: adminNotes || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDisplayName("");
      setDateOfBirth("");
      setAdminNotes("");
      router.push(`/dashboard/murid/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6 shadow-sm">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="student-name">Nama tampilan</Label>
          <Input
            id="student-name"
            name="displayName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="student-dob">Tanggal lahir (opsional)</Label>
          <Input
            id="student-dob"
            name="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-notes">Catatan admin (opsional)</Label>
          <Textarea
            id="student-notes"
            name="adminNotes"
            rows={3}
            maxLength={2000}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="h-9" disabled={pending}>
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
