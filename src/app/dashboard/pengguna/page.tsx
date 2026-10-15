import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListFilters } from "@/components/dashboard/list-filters";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { UserList } from "@/components/dashboard/user-list";
import type { ListQueryInput } from "@/lib/list-query";
import { AuthzError, requireRole } from "@/server/policies/access";
import { listUsers } from "@/server/actions/invites";

export const instant = false;

function toInput(
  sp: Record<string, string | string[] | undefined>,
): ListQueryInput {
  return sp;
}

async function PenggunaContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let admin;
  try {
    admin = await requireRole("ADMIN");
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect("/dashboard");
    }
    throw error;
  }

  const raw = toInput(await searchParams);
  const result = await listUsers(raw);

  const flatParams: Record<string, string | undefined> = {
    q: typeof raw.q === "string" ? raw.q : undefined,
    role: typeof raw.role === "string" ? raw.role : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    order: typeof raw.order === "string" ? raw.order : undefined,
  };

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
            Pengguna
          </h1>
          <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Kelola akun. Undang pengguna baru lewat tombol Buat undangan.
          </p>
        </div>
        <Link
          href="/dashboard/pengguna/undang"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
        >
          Buat undangan
        </Link>
      </div>

      <div className="mt-6">
        <ListFilters
          searchPlaceholder="Cari nama atau email…"
          defaultSortValue="createdAt:desc"
          filters={[
            {
              name: "role",
              label: "Peran",
              allLabel: "Semua peran",
              options: [
                { value: "ADMIN", label: "Admin" },
                { value: "TERAPIS", label: "Terapis" },
                { value: "ORANG_TUA", label: "Orang tua" },
              ],
            },
            {
              name: "status",
              label: "Status",
              allLabel: "Semua status",
              options: [
                { value: "ACTIVE", label: "Aktif" },
                { value: "DISABLED", label: "Nonaktif" },
              ],
            },
          ]}
          sortOptions={[
            { value: "createdAt:desc", label: "Terbaru" },
            { value: "createdAt:asc", label: "Terlama" },
            { value: "name:asc", label: "Nama A→Z" },
            { value: "name:desc", label: "Nama Z→A" },
            { value: "email:asc", label: "Email A→Z" },
            { value: "email:desc", label: "Email Z→A" },
          ]}
        />
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Daftar pengguna
        </h2>
        <UserList users={result.items} currentUserId={admin.id} />
        <ListPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          searchParams={flatParams}
          basePath="/dashboard/pengguna"
        />
      </section>
    </main>
  );
}

export default function PenggunaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
          <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat pengguna…</p>
        </main>
      }
    >
      <PenggunaContent searchParams={searchParams} />
    </Suspense>
  );
}
