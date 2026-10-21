"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { disableUser } from "@/server/actions/invites";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";

type Props = {
  userId: string;
  displayName: string;
  className?: string;
};

export function DeleteUserDialog({
  userId,
  displayName,
  className,
}: Props) {
  const router = useRouter();
  const reasonId = useId();
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setReason("");
    setError(null);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError("Alasan minimal 10 karakter.");
      return;
    }
    startTransition(async () => {
      const result = await disableUser({ userId, reason: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "min-h-11 w-full border-[var(--danger,#9b2c2c)]/30 text-[var(--danger,#9b2c2c)] hover:bg-[var(--danger,#9b2c2c)]/8 sm:w-auto",
              className,
            )}
          />
        }
      >
        <Trash2 className="size-4" aria-hidden />
        Hapus
      </DialogTrigger>

      <DialogContent
        className="gap-0 border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-0 sm:max-w-md"
        showCloseButton
      >
        <form onSubmit={onSubmit}>
          <DialogHeader className="gap-2 border-b border-[var(--cermin-border,#d9e2ec)] px-4 py-4 sm:px-5">
            <DialogTitle className="text-[var(--text,#1f2933)]">
              Hapus pengguna?
            </DialogTitle>
            <DialogDescription className="text-[var(--cermin-muted,#5c6b73)]">
              Akun{" "}
              <span className="font-medium text-[var(--text,#1f2933)]">
                {displayName}
              </span>{" "}
              akan dinonaktifkan (bukan dihapus permanen). Login ditolak; data
              terkait tetap tersimpan. Alasan dan nama Anda tercatat untuk audit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-4 py-4 sm:px-5">
            <Label htmlFor={reasonId} className="text-[var(--text,#1f2933)]">
              Alasan penghapusan{" "}
              <span className="text-[var(--danger,#9b2c2c)]" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id={reasonId}
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: tidak lagi bertugas, undangan salah, permintaan lembaga…"
              rows={4}
              maxLength={500}
              required
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-h-24 resize-y text-base"
            />
            <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
              Minimal 10 karakter. {reason.trim().length}/500
            </p>
            {error ? (
              <p
                id={errorId}
                className="text-sm text-[var(--danger,#9b2c2c)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]/80">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="min-h-11"
              disabled={pending || reason.trim().length < 10}
            >
              {pending ? "Menghapus…" : "Ya, hapus pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
