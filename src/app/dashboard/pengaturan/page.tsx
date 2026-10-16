import Link from "next/link";
import { InstallHint } from "@/components/pwa/install-hint";
import { APP_VERSION, appVersionLabel } from "@/lib/app-version";
import { requireSession } from "@/server/policies/access";
import { getMyPreference } from "@/server/actions/preferences";
import { getBrandingPublic } from "@/server/queries/branding";
import { BrandingForm } from "./branding-form";
import { InstitutionProfileForm } from "./institution-profile-form";
import { PreferenceForm } from "./preference-form";

async function PengaturanContent() {
  const [user, pref, branding] = await Promise.all([
    requireSession(),
    getMyPreference(),
    getBrandingPublic(),
  ]);
  const isAdmin = user.role === "ADMIN";

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <div className="mt-2 w-full">
        <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
          Pengaturan
        </h1>
        <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)] sm:text-base">
          Sesuaikan ukuran teks dan audio untuk sesi belajar yang Anda pandu.
          Preferensi ini mengikuti akun Anda, bukan profil murid.
        </p>
      </div>

      <div className="mt-8 w-full space-y-8">
        {isAdmin ? (
          <>
            <BrandingForm
              hasLogo={branding.hasLogo}
              logoVersion={branding.logoVersion}
            />
            <InstitutionProfileForm
              initial={{
                name: branding.name,
                address: branding.address,
                websiteUrl: branding.websiteUrl,
                instagramUrl: branding.instagramUrl,
                facebookUrl: branding.facebookUrl,
                youtubeUrl: branding.youtubeUrl,
                whatsappUrl: branding.whatsappUrl,
              }}
            />
          </>
        ) : null}
        <InstallHint />
        <PreferenceForm
          initialTextSize={pref.textSize}
          initialAudioEnabled={pref.audioEnabled}
        />
      </div>

      <p className="mt-10 w-full text-sm text-[var(--cermin-muted,#5c6b73)]">
        Siap mencoba?{" "}
        <Link
          href="/dashboard/sesi"
          className="font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
        >
          Mulai sesi di halaman Sesi
        </Link>
        .
      </p>

      <p
        className="mt-8 text-xs text-[var(--cermin-muted,#5c6b73)]"
        data-app-version={APP_VERSION}
      >
        {appVersionLabel()} · PWA
      </p>
    </main>
  );
}

export default async function PengaturanPage() {
  return (
    <PengaturanContent />
  );
}
