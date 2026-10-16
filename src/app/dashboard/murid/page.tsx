import Link from "next/link";
import { ListFilters } from "@/components/dashboard/list-filters";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { ListStatusTabs } from "@/components/dashboard/list-status-tabs";
import { StudentList } from "@/components/dashboard/student-list";
import { requireSession } from "@/server/policies/access";
import { listStudentsForViewer } from "@/server/actions/students";
import type { ListQueryInput } from "@/lib/list-query";


function toInput(
  sp: Record<string, string | string[] | undefined>,
): ListQueryInput {
  return sp;
}

async function MuridContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const isAdmin = user.role === "ADMIN";
  const raw = toInput(await searchParams);
  // Default tab Aktif bila ?status kosong.
  const statusParam =
    typeof raw.status === "string" ? raw.status : undefined;
  const effectiveStatus = statusParam ?? "ACTIVE";
  const result = await listStudentsForViewer({
    ...raw,
    status: effectiveStatus,
  });

  const flatParams: Record<string, string | undefined> = {
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: statusParam,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    order: typeof raw.order === "string" ? raw.order : undefined,
  };

  const statusTabs = isAdmin
    ? [
        { value: "ACTIVE", label: "Aktif" },
        { value: "ARCHIVED", label: "Arsip" },
        { value: "ALL", label: "Semua" },
      ]
    : [{ value: "ACTIVE", label: "Aktif" }];

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div className="mt-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text,#1f2933)]">
            Murid
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
            {isAdmin
              ? "Kelola profil murid, penugasan terapis, dan tautan orang tua. Hapus = arsip dengan alasan."
              : "Daftar murid yang dapat Anda akses."}
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/dashboard/murid/baru"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
          >
            Buat murid
          </Link>
        ) : null}
      </div>

      {isAdmin ? (
        <div className="mt-6">
          <ListStatusTabs
            options={statusTabs}
            defaultValue="ACTIVE"
            label="Status murid"
          />
        </div>
      ) : null}

      <div className={isAdmin ? "mt-4" : "mt-6"}>
        <ListFilters
          searchPlaceholder="Cari nama atau telepon…"
          defaultSortValue="name:asc"
          sortOptions={[
            { value: "name:asc", label: "Nama A→Z" },
            { value: "name:desc", label: "Nama Z→A" },
            { value: "createdAt:desc", label: "Terbaru ditambah" },
            { value: "createdAt:asc", label: "Terlama ditambah" },
          ]}
        />
      </div>

      <section className="mt-6 space-y-3" aria-labelledby="daftar-murid-heading">
        <h2
          id="daftar-murid-heading"
          className="text-lg font-semibold text-[var(--text,#1f2933)]"
        >
          {effectiveStatus === "ARCHIVED"
            ? "Murid diarsipkan"
            : effectiveStatus === "ALL"
              ? "Semua murid"
              : "Daftar murid"}
        </h2>
        <StudentList students={result.items} isAdmin={isAdmin} />
        <ListPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          searchParams={flatParams}
          basePath="/dashboard/murid"
        />
      </section>
    </main>
  );
}

export default async function MuridPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MuridContent searchParams={searchParams} />;
}
