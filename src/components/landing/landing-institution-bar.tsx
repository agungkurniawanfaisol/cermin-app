import { MapPin } from "lucide-react";
import type { BrandingPublic } from "@/lib/branding-public";
import { buildBrandingSocial } from "@/lib/branding-social";

type Props = {
  branding: BrandingPublic;
};

/**
 * Strip kontak lembaga di bawah header — hanya jika ada data dari Pengaturan.
 * Kosong → tidak dirender (hindari CERMIN dobel dengan LandingHeader).
 */
export function LandingInstitutionBar({ branding }: Props) {
  const name = branding.name?.trim() || null;
  const address = branding.address?.trim() || null;
  const social = buildBrandingSocial(branding);

  if (!name && !address && social.length === 0) {
    return null;
  }

  return (
    <aside
      className="relative z-10 border-b border-[var(--cermin-border)] bg-[var(--surface)]"
      aria-label="Kontak lembaga"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-8 sm:py-5 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0 space-y-1.5">
          {name ? (
            <>
              <p className="text-base font-semibold text-[var(--cermin-accent)]">
                {name}
              </p>
              <p className="text-sm text-[var(--cermin-muted)]">
                CERMIN · CERita MIRip Aku
              </p>
            </>
          ) : null}
          {address ? (
            <p className="flex gap-2 text-sm leading-relaxed text-[var(--text)]">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-[var(--cermin-accent)]"
                aria-hidden
                strokeWidth={1.75}
              />
              <span className="whitespace-pre-line">{address}</span>
            </p>
          ) : null}
        </div>

        {social.length > 0 ? (
          <ul
            className="flex flex-wrap gap-2 md:justify-end"
            aria-label="Media sosial lembaga"
          >
            {social.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--cermin-border)] bg-[var(--bg)] px-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--cermin-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                >
                  <Icon className="size-4" aria-hidden strokeWidth={1.75} />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
