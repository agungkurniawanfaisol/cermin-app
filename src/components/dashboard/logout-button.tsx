"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "cn";
import { authClient } from "@/lib/auth-client";

type LogoutButtonProps = {
  className?: string;
  /** Compact icon+label for sidebar / drawer */
  fullWidth?: boolean;
  /** Icon-only (collapsed sidebar) */
  iconOnly?: boolean;
};

export function LogoutButton({
  className,
  fullWidth,
  iconOnly,
}: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await authClient.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  const label = pending ? "Keluar…" : "Keluar";

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
        "text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)] hover:text-[var(--cermin-accent,#3d7c6b)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth && "w-full justify-start",
        iconOnly && "w-full justify-center px-0",
        className,
      )}
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}
