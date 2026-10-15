"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Kata sandi tidak cocok");
      return;
    }
    startTransition(async () => {
      const result = await acceptInvite({ token, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Konfirmasi kata sandi</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
        />
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Memproses…" : "Aktifkan akun"}
      </Button>
    </form>
  );
}
