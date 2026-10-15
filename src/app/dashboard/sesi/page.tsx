import { Suspense } from "react";
import { ListFilters } from "@/components/dashboard/list-filters";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { SessionList } from "@/components/dashboard/session-list";
import type { ListQueryInput } from "@/lib/list-query";
import { listActiveStudentsForSession } from "@/server/actions/students";
import {
  listLearningSessionsForViewer,
  listPublishedStoriesForSession,
} from "@/server/actions/sessions";
import { requireSession } from "@/server/policies/access";
import { StartSessionForm } from "./start-session-form";

export const instant = false;

function toInput(
  sp: Record<string, string | string[] | undefined>,
): ListQueryInput {
  return sp;
}

function SesiFallback() {
  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat sesi…</p>
    </main>
  );
}

async function SesiContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const raw = toInput(await searchParams);

  const [students, stories, history] = await Promise.all([
    listActiveStudentsForSession(),
    listPublishedStoriesForSession(),
    listLearningSessionsForViewer(raw),
  ]);

  const flatParams: Record<string, string | undefined> = {
    q: typeof raw.q === "string" ? raw.q : undefined,
    state: typeof raw.state === "string" ? raw.state : undefined,
    studentId: typeof raw.studentId === "string" ? raw.studentId : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    order: typeof raw.order === "string" ? raw.order : undefined,
  };

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Sesi belajar
      </h1>
      <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
        Pilih murid dan cerita terbit, lalu buka mode anak untuk belajar
        bersama.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Mulai sesi baru
        </h2>
        <StartSessionForm students={students} stories={stories} />
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Riwayat sesi
        </h2>
        <ListFilters
          searchPlaceholder="Cari murid, cerita, atau pemandu…"
          defaultSortValue="startedAt:desc"
          filters={[
            {
              name: "state",
              label: "Keadaan",
              allLabel: "Semua",
              options: [
                { value: "OPEN", label: "Berjalan" },
                { value: "ENDED", label: "Selesai" },
              ],
            },
            {
              name: "studentId",
              label: "Murid",
              allLabel: "Semua murid",
              options: students.map((s) => ({
                value: s.id,
                label: s.displayName,
              })),
            },
          ]}
          sortOptions={[
            { value: "startedAt:desc", label: "Terbaru" },
            { value: "startedAt:asc", label: "Terlama" },
          ]}
        />

        <SessionList sessions={history.items} />
        <ListPagination
          page={history.page}
          totalPages={history.totalPages}
          total={history.total}
          pageSize={history.pageSize}
          searchParams={flatParams}
          basePath="/dashboard/sesi"
        />
      </section>
    </main>
  );
}

export default function SesiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<SesiFallback />}>
      <SesiContent searchParams={searchParams} />
    </Suspense>
  );
}
