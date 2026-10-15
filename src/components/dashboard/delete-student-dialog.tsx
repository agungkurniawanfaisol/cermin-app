"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { archiveStudent } from "@/server/actions/students";
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

type Variant = "icon" | "button" | "full";

type Props = {
  studentId: string;
  displayName: string;
  /** After success: detail page redirects to list. */
  redirectToList?: boolean;
  variant?: Variant;
  className?: string;
  triggerClassName?: string;
};

export function DeleteStudentDialog({
  studentId,
  displayName,
  redirectToList = false,
  variant = "button",
  className,
  triggerClassName,
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
      const result = await archiveStudent({ studentId, reason: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      if (redirectToList) {
        router.push("/dashboard/murid");
      }
      router.refresh();
    });
  }

  const triggerButtonClass = cn(
    variant === "icon" &&
      "min-h-11 min-w-11 border-[var(--danger,#9b2c2c)]/30 text-[var(--danger,#9b2c2c)] hover:bg-[var(--danger,#9b2c2c)]/8 hover:text-[var(--danger,#9b2c2c)]",
    variant === "full" &&
      "min-h-11 w-full border-[var(--danger,#9b2c2c)]/35 text-[var(--danger,#9b2c2c)] hover:bg-[var(--danger,#9b2c2c)]/8 sm:w-auto",
    variant === "button" &&
      "min-h-11 border-[var(--danger,#9b2c2c)]/30 text-[var(--danger,#9b2c2c)] hover:bg-[var(--danger,#9b2c2c)]/8",
    triggerClassName,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={variant === "icon" ? "icon" : variant === "button" ? "sm" : "default"}
            className={triggerButtonClass}
            aria-label={
              variant === "icon" ? `Hapus murid ${displayName}` : undefined
            }
          />
        }
      >
        <Trash2 className="size-4" aria-hidden />
        {variant === "icon" ? (
          <span className="sr-only">Hapus {displayName}</span>
        ) : variant === "full" ? (
          "Hapus murid"
        ) : (
          "Hapus"
        )}
      </DialogTrigger>

      <DialogContent
        className={cn(
          "gap-0 border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-0 sm:max-w-md",
          className,
        )}
        showCloseButton
      >
        <form onSubmit={onSubmit}>
          <DialogHeader className="gap-2 border-b border-[var(--cermin-border,#d9e2ec)] px-4 py-4 sm:px-5">
            <DialogTitle className="text-[var(--text,#1f2933)]">
              Hapus murid?
            </DialogTitle>
            <DialogDescription className="text-[var(--cermin-muted,#5c6b73)]">
              Profil{" "}
              <span className="font-medium text-[var(--text,#1f2933)]">
                {displayName}
              </span>{" "}
              akan diarsipkan (bukan dihapus permanen). Penugasan terapis aktif
              ditutup. Riwayat sesi tetap tersimpan. Alasan wajib untuk audit.
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
              placeholder="Contoh: keluarga pindah klinik, permintaan ortu, data uji coba…"
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
              {pending ? "Menghapus…" : "Ya, hapus murid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
