import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-3 py-2 text-base text-[var(--text,#1f2933)] transition-colors outline-none placeholder:text-[var(--cermin-muted,#5c6b73)] focus-visible:border-[var(--focus,#0b6e4f)] focus-visible:ring-3 focus-visible:ring-[var(--focus,#0b6e4f)]/40 disabled:cursor-not-allowed disabled:bg-[var(--bg,#f7f4ef)] disabled:opacity-60 aria-invalid:border-[var(--danger,#9b2c2c)] aria-invalid:ring-3 aria-invalid:ring-[var(--danger,#9b2c2c)]/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
