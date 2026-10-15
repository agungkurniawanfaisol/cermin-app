import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-3 py-2 text-base text-[var(--text,#1f2933)] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text,#1f2933)] placeholder:text-[var(--cermin-muted,#5c6b73)] focus-visible:border-[var(--focus,#0b6e4f)] focus-visible:ring-3 focus-visible:ring-[var(--focus,#0b6e4f)]/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--bg,#f7f4ef)] disabled:opacity-60 aria-invalid:border-[var(--danger,#9b2c2c)] aria-invalid:ring-3 aria-invalid:ring-[var(--danger,#9b2c2c)]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
