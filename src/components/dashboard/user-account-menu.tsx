"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, CameraIcon, SettingsIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { uploadUserAvatar } from "@/server/actions/avatars";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserAccountMenuProps = {
  name: string;
  email: string;
  roleLabel: string;
  hasImage: boolean;
  /** Avatar-only trigger (collapsed sidebar) */
  compact?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? name;
  return parts[0]!;
}

export function UserAccountMenu({
  name,
  email,
  roleLabel,
  hasImage,
  compact = false,
}: UserAccountMenuProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fetchedAvatarUrl, setFetchedAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loggingOut, setLoggingOut] = useState(false);
  const avatarUrl = hasImage ? fetchedAvatarUrl : null;

  useEffect(() => {
    if (!hasImage) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/avatar/me");
        const body = (await res.json()) as { url?: string | null };
        if (!cancelled && res.ok && body.url) setFetchedAvatarUrl(body.url);
      } catch {
        // keep fallback initials
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasImage]);

  function onPickPhoto() {
    setError(null);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadUserAvatar(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
      try {
        const res = await fetch("/api/avatar/me");
        const body = (await res.json()) as { url?: string | null };
        if (res.ok && body.url) setFetchedAvatarUrl(body.url);
      } catch {
        /* ignore */
      }
    });
  }

  async function onLogout() {
    setLoggingOut(true);
    setError(null);
    router.replace("/login");
    try {
      await authClient.signOut();
    } catch {
      setError("Gagal keluar. Coba lagi.");
      setLoggingOut(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={onFileChange}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            compact
              ? "inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-[var(--cermin-border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)]/60 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              : "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--cermin-border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)]/60 px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 sm:px-3"
          }
          aria-label="Menu akun"
          title={compact ? name : undefined}
        >
          <Avatar size="sm" className="size-8">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={`Foto ${name}`} />
            ) : null}
            <AvatarFallback className="bg-white text-xs font-medium text-[var(--cermin-accent,#3d7c6b)]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          {!compact ? (
            <>
              <span className="hidden max-w-[7rem] truncate text-sm font-medium text-[var(--text,#1f2933)] sm:inline sm:max-w-[10rem]">
                {shortName(name)}
              </span>
              <span className="hidden rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] sm:inline">
                {roleLabel}
              </span>
            </>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-[var(--text,#1f2933)]">
              {name}
            </p>
            <p className="truncate text-xs text-[var(--cermin-muted,#5c6b73)]">
              {email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending || loggingOut}
            onClick={onPickPhoto}
            className="cursor-pointer gap-2"
          >
            <CameraIcon className="size-4" aria-hidden />
            {pending ? "Mengunggah…" : "Unggah foto profil"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending || loggingOut}
            className="cursor-pointer gap-2"
            onClick={() => router.push("/dashboard/pengaturan")}
          >
            <SettingsIcon className="size-4" aria-hidden />
            Pengaturan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending || loggingOut}
            variant="destructive"
            onClick={() => void onLogout()}
            className="cursor-pointer gap-2"
          >
            <LogOutIcon className="size-4" aria-hidden />
            {loggingOut ? "Keluar…" : "Keluar"}
          </DropdownMenuItem>
          {error ? (
            <p
              className="px-2 py-1.5 text-xs text-[var(--danger,#9b2c2c)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
