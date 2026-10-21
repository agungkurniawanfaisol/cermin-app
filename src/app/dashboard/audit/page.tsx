import { redirect } from "next/navigation";
import { ListFilters } from "@/components/dashboard/list-filters";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { AuditLogList } from "@/components/dashboard/audit-log-list";
import type { ListQueryInput } from "@/lib/list-query";
import { listAuditLogsForAdmin } from "@/server/actions/audit";
import { AuthzError, requireRole } from "@/server/policies/access";
import {
  ALL_AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/server/validations/audit";

function toInput(
  sp: Record<string, string | string[] | undefined>,
): ListQueryInput {
  return sp;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireRole("ADMIN");
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect("/dashboard");
    }
    throw error;
  }

  const raw = toInput(await searchParams);
  const result = await listAuditLogsForAdmin(raw);

  const flatParams: Record<string, string | undefined> = {
    q: typeof raw.q === "string" ? raw.q : undefined,
    action: typeof raw.action === "string" ? raw.action : undefined,
    entityType: typeof raw.entityType === "string" ? raw.entityType : undefined,
    from: typeof raw.from === "string" ? raw.from : undefined,
    to: typeof raw.to === "string" ? raw.to : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    order: typeof raw.order === "string" ? raw.order : undefined,
  };

  const actionOptions = ALL_AUDIT_ACTIONS.map((value) => ({
    value,
    label: value,
  }));
  const entityOptions = AUDIT_ENTITY_TYPES.map((value) => ({
    value,
    label: value,
  }));

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Audit
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--cermin-muted,#5c6b73)]">
        Catatan mutasi sensitif (undangan, murid, cerita, sesi, media). Hanya
        Admin. Metadata sudah disanitasi — tanpa password, token, atau catatan
        observasi.
      </p>

      <div className="mt-6">
        <ListFilters
          searchPlaceholder="Cari aksi atau tipe entitas…"
          defaultSortValue="createdAt:desc"
          filters={[
            {
              name: "action",
              label: "Aksi",
              allLabel: "Semua aksi",
              options: actionOptions,
            },
            {
              name: "entityType",
              label: "Entitas",
              allLabel: "Semua entitas",
              options: entityOptions,
            },
          ]}
          sortOptions={[
            { value: "createdAt:desc", label: "Terbaru" },
            { value: "createdAt:asc", label: "Terlama" },
          ]}
        />
      </div>

      <div className="mt-4">
        <AuditLogList items={result.items} />
      </div>

      <div className="mt-6">
        <ListPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          searchParams={flatParams}
          basePath="/dashboard/audit"
        />
      </div>
    </main>
  );
}
