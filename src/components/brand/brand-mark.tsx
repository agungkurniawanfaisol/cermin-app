import Image from "next/image";
import { cn } from "cn";
import { brandingLogoSrc } from "@/lib/branding-public";

type BrandMarkProps = {
  hasLogo: boolean;
  logoVersion: string | null;
  /** Compact for collapsed sidebar */
  compact?: boolean;
  className?: string;
  /** Show wordmark next to logo when space allows */
  showWordmark?: boolean;
};

/**
 * Logo lembaga atau wordmark CERMIN. Dipakai landing + chrome dasbor.
 */
export function BrandMark({
  hasLogo,
  logoVersion,
  compact = false,
  className,
  showWordmark = true,
}: BrandMarkProps) {
  if (hasLogo) {
    return (
      <span
        className={cn(
          "inline-flex min-h-11 items-center gap-2.5",
          className,
        )}
      >
        <span
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-[var(--cermin-border,#d9e2ec)]",
            compact ? "size-9" : "h-10 w-10 sm:h-11 sm:w-11",
          )}
        >
          <Image
            src={brandingLogoSrc(logoVersion)}
            alt="Logo lembaga"
            fill
            sizes={compact ? "36px" : "44px"}
            className="object-contain p-1"
            unoptimized
            priority
          />
        </span>
        {showWordmark && !compact ? (
          <span className="text-base font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
            CERMIN
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase",
        compact ? "text-xs" : "text-base",
        className,
      )}
    >
      {compact ? "C" : "CERMIN"}
    </span>
  );
}
