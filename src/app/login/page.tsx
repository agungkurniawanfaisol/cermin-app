"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) {
        setError("Email atau kata sandi salah");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Email atau kata sandi salah");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg,#f7f4ef)] px-4 py-12">
      <main className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
            CERMIN
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text,#1f2933)]">
            Masuk
          </h1>
          <p className="text-sm text-[var(--muted,#5c6b73)]">
            Gunakan email dan kata sandi akun Anda.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>

          {error ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </main>
    </div>
  );
}
