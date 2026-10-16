"use client";

import { useState, useTransition } from "react";
import { createInvite } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES = [
  { value: "TERAPIS", label: "Terapis" },
  { value: "ORANG_TUA", label: "Orang tua" },
  { value: "ADMIN", label: "Admin" },
] as const;

export function InviteForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("TERAPIS");
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);
    startTransition(async () => {
      const result = await createInvite({ name, email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const absolute =
        typeof window !== "undefined"
          ? `${window.location.origin}${result.data.inviteUrl}`
          : result.data.inviteUrl;
      setInviteUrl(absolute);
      setName("");
      setEmail("");
      setRole("TERAPIS");
    });
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-sm sm:p-5">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="invite-name">Nama</Label>
          <Input
            id="invite-name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="invite-role">Peran</Label>
          <select
            id="invite-role"
            name="role"
            className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as (typeof ROLES)[number]["value"])
            }
            disabled={pending}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            disabled={pending}
          >
            {pending ? "Membuat…" : "Buat undangan"}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}

      {inviteUrl ? (
        <div className="space-y-2 rounded-lg border border-[var(--cermin-accent,#3d7c6b)]/30 bg-[var(--bg,#f7f4ef)] p-4">
          <p className="text-sm font-medium text-[var(--text,#1f2933)]">
            Tautan undangan (salin dan kirim secara manual):
          </p>
          <p className="break-all font-mono text-xs text-[var(--muted,#5c6b73)]">
            {inviteUrl}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={copyLink}
          >
            Salin tautan
          </Button>
        </div>
      ) : null}
    </div>
  );
}
