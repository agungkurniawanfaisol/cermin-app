"use client";

import { useState, useTransition } from "react";
import { disableUser } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";

export function DisableUserButton({ userId }: { userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDisable() {
    setError(null);
    if (!window.confirm("Nonaktifkan pengguna ini?")) return;
    startTransition(async () => {
      const result = await disableUser(userId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDisable}
        disabled={pending}
      >
        {pending ? "…" : "Nonaktifkan"}
      </Button>
      {error ? (
        <p className="text-xs text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
