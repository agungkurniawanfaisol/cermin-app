import { MapPin } from "lucide-react";
import type { BrandingPublic } from "@/lib/branding-public";
import { buildBrandingSocial } from "@/lib/branding-social";

type LandingFooterProps = {
  branding: BrandingPublic;
};

export function LandingFooter({ branding }: LandingFooterProps) {
  const displayName = branding.name?.trim() || "CERMIN";
  const social = buildBrandingSocial(branding);

  return (
    <footer
      id="kontak"
      className="relative z-10 border-t border-[var(--cermin-border)] bg-[color-mix(in_srgb,var(--surface)_70%,var(--bg))]"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-8 sm:py-12 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3 text-left">
          <p className="text-base font-semibold text-[var(--cermin-accent)]">
            {displayName}
          </p>
          {branding.name?.trim() ? (
            <p className="text-sm text-[var(--cermin-muted)]">
              CERMIN · CERita MIRip Aku
            </p>
          ) : (
            <p className="text-sm text-[var(--cermin-muted)]">
              Pembelajaran social story yang tenang untuk anak autistik
            </p>
          )}
          {branding.address?.trim() ? (
            <p className="flex gap-2 text-sm leading-relaxed text-[var(--text)]">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-[var(--cermin-accent)]"
                aria-hidden
                strokeWidth={1.75}
              />
              <span className="whitespace-pre-line">
                {branding.address.trim()}
              </span>
            </p>
          ) : null}
        </div>

        <div className="space-y-3 md:justify-self-end md:text-right">
          {social.length > 0 ? (
            <>
              <p className="text-sm font-medium text-[var(--text)]">
                Hubungi kami
              </p>
              <ul className="flex flex-wrap gap-2 md:justify-end">
                {social.map(({ href, label, icon: Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--cermin-border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--cermin-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                    >
                      <Icon className="size-4" aria-hidden strokeWidth={1.75} />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--cermin-border)] px-4 py-4 text-center sm:px-8">
        <p className="text-xs text-[var(--cermin-muted)]">
          © {displayName}. Platform CERMIN.
        </p>
      </div>
    </footer>
  );
}
