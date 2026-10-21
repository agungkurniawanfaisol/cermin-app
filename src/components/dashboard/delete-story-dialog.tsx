"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { archiveStory } from "@/server/actions/stories";
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
  storyId: string;
  title: string;
  variant?: Variant;
  className?: string;
  triggerClassName?: string;
  /** Tanpa trigger — dikontrol parent (mis. StatusTimeline). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function DeleteStoryDialog({
  storyId,
  title,
  variant = "icon",
  className,
  triggerClassName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: Props) {
  const router = useRouter();
  const reasonId = useId();
  const errorId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

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
      const result = await archiveStory({ storyId, reason: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
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
      {hideTrigger ? null : (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size={
                variant === "icon"
                  ? "icon"
                  : variant === "button"
                    ? "sm"
                    : "default"
              }
              className={triggerButtonClass}
              aria-label={
                variant === "icon" ? `Hapus cerita ${title}` : undefined
              }
              title="Hapus cerita"
            />
          }
        >
          <Trash2 className="size-4" aria-hidden />
          {variant === "icon" ? (
            <span className="sr-only">Hapus {title}</span>
          ) : variant === "full" ? (
            "Hapus cerita"
          ) : (
            "Hapus"
          )}
        </DialogTrigger>
      )}

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
              Hapus cerita?
            </DialogTitle>
            <DialogDescription className="text-[var(--cermin-muted,#5c6b73)]">
              Cerita{" "}
              <span className="font-medium text-[var(--text,#1f2933)]">
                {title}
              </span>{" "}
              akan diarsipkan (bukan dihapus permanen). Tidak bisa diedit lagi.
              Riwayat sesi tetap ada. Alasan dan nama Anda tercatat untuk audit.
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
              placeholder="Contoh: diganti cerita baru, konten tidak relevan, data uji coba…"
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
              {pending ? "Menghapus…" : "Ya, hapus cerita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
