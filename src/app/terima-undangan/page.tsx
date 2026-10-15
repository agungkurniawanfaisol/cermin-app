import { Suspense } from "react";
import { AcceptInviteForm } from "./accept-invite-form";

export const instant = false;

async function TerimaUndanganContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg,#f7f4ef)] px-4 py-12 sm:px-6 md:px-8">
      <main className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
            CERMIN
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text,#1f2933)]">
            Terima undangan
          </h1>
          <p className="text-sm text-[var(--muted,#5c6b73)]">
            Atur kata sandi untuk mengaktifkan akun Anda.
          </p>
        </div>

        {token ? (
          <AcceptInviteForm token={token} />
        ) : (
          <p
            className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6 text-sm text-[var(--danger,#9b2c2c)]"
            role="alert"
          >
            Tautan undangan tidak valid. Minta admin mengirim ulang undangan.
          </p>
        )}
      </main>
    </div>
  );
}

export default function TerimaUndanganPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-4 py-6 font-sans text-[var(--muted,#5c6b73)] sm:px-6 sm:py-8">
          Memuat…
        </main>
      }
    >
      <TerimaUndanganContent searchParams={searchParams} />
    </Suspense>
  );
}
