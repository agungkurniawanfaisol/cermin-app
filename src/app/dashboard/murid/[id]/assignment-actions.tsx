"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  endTherapistAssignment,
  unlinkParent,
} from "@/server/actions/assignments";
import { Button } from "@/components/ui/button";

export function EndAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onEnd() {
    setError(null);
    if (!window.confirm("Akhiri penugasan terapis ini?")) return;
    startTransition(async () => {
      const result = await endTherapistAssignment({ assignmentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        onClick={onEnd}
        disabled={pending}
      >
        {pending ? "Memproses…" : "Akhiri"}
      </Button>
      {error ? (
        <p className="text-xs text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function UnlinkParentButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onUnlink() {
    setError(null);
    if (!window.confirm("Lepas tautan orang tua ini?")) return;
    startTransition(async () => {
      const result = await unlinkParent({ linkId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        onClick={onUnlink}
        disabled={pending}
      >
        {pending ? "Memproses…" : "Lepas"}
      </Button>
      {error ? (
        <p className="text-xs text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
