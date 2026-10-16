"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, HeartHandshake, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail } from "@/server/actions/auth-login";

const AUDIENCES = [
  { label: "Admin", icon: Shield },
  { label: "Terapis", icon: HeartHandshake },
  { label: "Orang tua", icon: Users },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await loginWithEmail({ email, password });
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      // Hard nav — cegah soft-nav meninggalkan tree login di samping dasbor.
      window.location.assign("/dashboard");
    } catch {
      setError("Email atau kata sandi salah");
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-x-hidden bg-[var(--bg)] lg:flex-row">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_10%_0%,var(--accent-soft)_0%,transparent_55%)] lg:hidden"
      />

      {/* Visual panel — desktop / large tablet */}
      <aside className="relative hidden min-h-dvh w-full max-w-none shrink-0 flex-col justify-between overflow-hidden border-r border-[var(--cermin-border)] lg:flex lg:w-[42%] xl:w-[45%]">
        <Image
          src="/images/landing/cermin-care-together.jpg"
          alt="Kolaborasi orang dewasa menyusun kartu cerita sosial"
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 40vw, 0px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--bg)_55%,transparent)_0%,color-mix(in_srgb,var(--cermin-accent)_45%,#1f2933)_100%)]"
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
          <Link
            href="/"
            className="text-lg font-semibold tracking-wide text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            CERMIN
          </Link>
          <div className="w-full max-w-lg space-y-4 text-white">
            <h2 className="text-2xl font-semibold leading-snug xl:text-3xl">
              Dasbor dewasa untuk mendampingi cerita sosial
            </h2>
            <p className="text-sm leading-relaxed text-white/90 xl:text-base">
              Masuk sebagai Admin, Terapis, atau Orang tua. Anak tidak memakai
              halaman ini — sesi belajar dibuka dari dasbor.
            </p>
            <ul className="flex flex-wrap gap-2 pt-1">
              {AUDIENCES.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
                >
                  <Icon className="size-3.5" aria-hidden strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-12 xl:px-16">
        <main className="mx-auto w-full max-w-xl space-y-8 lg:mx-0 lg:max-w-none">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex text-base font-semibold tracking-wide text-[var(--cermin-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] lg:hidden"
            >
              CERMIN
            </Link>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                Masuk ke dasbor
              </h1>
              <p className="text-sm leading-relaxed text-[var(--cermin-muted)] sm:text-base">
                Gunakan email dan kata sandi dari undangan lembaga Anda.
              </p>
            </div>
            <ul
              className="flex flex-wrap gap-2 lg:hidden"
              aria-label="Peran yang dapat masuk"
            >
              {AUDIENCES.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cermin-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--cermin-muted)]"
                >
                  <Icon
                    className="size-3.5 text-[var(--cermin-accent)]"
                    aria-hidden
                    strokeWidth={1.75}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-[var(--cermin-border)] bg-[var(--surface)] p-6 shadow-[0_16px_40px_-28px_color-mix(in_srgb,var(--cermin-accent)_28%,transparent)] sm:p-8"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                inputMode="email"
                placeholder="nama@lembaga.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1.5 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[var(--cermin-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={pending}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p
                className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_8%,white)] px-3 py-2 text-sm text-[var(--danger)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full bg-[var(--cermin-accent)] text-white hover:opacity-95"
              disabled={pending}
            >
              {pending ? "Memproses…" : "Masuk"}
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--cermin-muted)]">
            Belum punya akun? Minta undangan ke administrator lembaga.
          </p>

          <p className="text-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-[var(--cermin-accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Kembali ke beranda
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
