"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveStudent } from "@/server/actions/students";
import { Button } from "@/components/ui/button";

export function ArchiveStudentButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onArchive() {
    setError(null);
    if (!window.confirm("Arsipkan murid ini?")) return;
    startTransition(async () => {
      const result = await archiveStudent(studentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/murid");
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onArchive}
        disabled={pending}
      >
        {pending ? "…" : "Arsipkan"}
      </Button>
      {error ? (
        <p className="text-xs text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
