import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-[var(--focus,#0b6e4f)] focus-visible:ring-3 focus-visible:ring-[var(--focus,#0b6e4f)]/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--danger,#9b2c2c)] aria-invalid:ring-3 aria-invalid:ring-[var(--danger,#9b2c2c)]/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Warna lewat token CERMIN eksplisit — hindari teks putih tanpa latar (tak terlihat sampai hover/seleksi).
        default:
          "border-transparent bg-[var(--cermin-accent,#3d7c6b)] text-white hover:bg-[var(--focus,#0b6e4f)]",
        outline:
          "border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)] hover:text-[var(--text,#1f2933)] aria-expanded:bg-[var(--accent-soft,#e6f2ee)]",
        secondary:
          "border-transparent bg-[var(--accent-soft,#e6f2ee)] text-[var(--text,#1f2933)] hover:bg-[color-mix(in_srgb,var(--accent-soft,#e6f2ee)_85%,var(--cermin-accent,#3d7c6b))] aria-expanded:bg-[var(--accent-soft,#e6f2ee)]",
        ghost:
          "border-transparent bg-transparent text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)] hover:text-[var(--text,#1f2933)] aria-expanded:bg-[var(--accent-soft,#e6f2ee)]",
        destructive:
          "border-transparent bg-[color-mix(in_srgb,var(--danger,#9b2c2c)_12%,white)] text-[var(--danger,#9b2c2c)] hover:bg-[color-mix(in_srgb,var(--danger,#9b2c2c)_20%,white)] focus-visible:border-[var(--danger,#9b2c2c)]/40 focus-visible:ring-[var(--danger,#9b2c2c)]/20",
        link: "border-transparent bg-transparent text-[var(--cermin-accent,#3d7c6b)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 min-h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 min-h-9 gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 h-12 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-xs":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
