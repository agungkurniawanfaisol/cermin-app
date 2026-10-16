"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkParent } from "@/server/actions/assignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ParentOption = { id: string; name: string; email: string };

export function LinkParentForm({
  studentId,
  parents,
}: {
  studentId: string;
  parents: ParentOption[];
}) {
  const router = useRouter();
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [relationLabel, setRelationLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!parentId) {
      setError("Pilih orang tua");
      return;
    }
    startTransition(async () => {
      const result = await linkParent({
        studentId,
        parentId,
        relationLabel: relationLabel || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRelationLabel("");
      router.refresh();
    });
  }

  if (parents.length === 0) {
    return (
      <p className="text-sm text-[var(--muted,#5c6b73)]">
        Belum ada orang tua aktif. Undang orang tua di halaman Pengguna.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="link-parent">Orang tua</Label>
        <select
          id="link-parent"
          className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          disabled={pending}
        >
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.email})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="relation-label">Hubungan (opsional)</Label>
        <Input
          id="relation-label"
          value={relationLabel}
          onChange={(e) => setRelationLabel(e.target.value)}
          placeholder="mis. Ibu, Ayah"
          disabled={pending}
        />
      </div>
      <div className="flex w-full flex-col gap-2 sm:col-span-3 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          className="min-h-11 w-full sm:w-auto"
          disabled={pending}
        >
          {pending ? "Menautkan…" : "Tautkan"}
        </Button>
      </div>
      {error ? (
        <p
          className="sm:col-span-3 text-sm text-[var(--danger,#9b2c2c)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
