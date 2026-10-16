import { Suspense, type ReactNode } from "react";
import { ListFilters } from "@/components/dashboard/list-filters";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { SessionList } from "@/components/dashboard/session-list";
import { SessionListSkeleton } from "@/components/dashboard/session-list-skeleton";
import type { ListQueryInput } from "@/lib/list-query";
import { listActiveStudentsForSession } from "@/server/actions/students";
import {
  listLearningSessionsForViewer,
  listPublishedStoriesForSession,
} from "@/server/actions/sessions";
import { requireSession } from "@/server/policies/access";
import { SessionStartEntry } from "./session-start-entry";
import { SesiPageTabs } from "./sesi-page-tabs";

function toInput(
  sp: Record<string, string | string[] | undefined>,
): ListQueryInput {
  return sp;
}

function filterCacheKey(raw: ListQueryInput): string {
  return [
    typeof raw.q === "string" ? raw.q : "",
    typeof raw.state === "string" ? raw.state : "",
    typeof raw.studentId === "string" ? raw.studentId : "",
    typeof raw.sort === "string" ? raw.sort : "",
    typeof raw.order === "string" ? raw.order : "",
    typeof raw.page === "string" ? raw.page : "",
  ].join("|");
}

function parseTab(
  raw: string | string[] | undefined,
): "mulai" | "riwayat" {
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  return value === "riwayat" ? "riwayat" : "mulai";
}

function SesiShell({ children }: { children: ReactNode }) {
  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Sesi belajar
      </h1>
      <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
        Tekan play untuk memilih cerita di layar penuh, atau buka riwayat sesi
        di tab sebelah.
      </p>
      {children}
    </main>
  );
}

function SesiBodySkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div
        className="h-11 animate-pulse rounded-lg bg-[var(--accent-soft,#e6f2ee)]"
        aria-hidden
      />
      <div
        className="h-56 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)]"
        aria-hidden
      />
    </div>
  );
}

async function MulaiPanel() {
  const [students, stories] = await Promise.all([
    listActiveStudentsForSession(),
    listPublishedStoriesForSession(),
  ]);
  return (
    <SessionStartEntry
      hasStudents={students.length > 0}
      hasPublishedStories={stories.length > 0}
    />
  );
}

async function SessionHistory({
  raw,
  flatParams,
}: {
  raw: ListQueryInput;
  flatParams: Record<string, string | undefined>;
}) {
  const history = await listLearningSessionsForViewer(raw);
  return (
    <>
      <SessionList sessions={history.items} />
      <ListPagination
        page={history.page}
        totalPages={history.totalPages}
        total={history.total}
        pageSize={history.pageSize}
        searchParams={flatParams}
        basePath="/dashboard/sesi"
      />
    </>
  );
}

async function RiwayatPanel({
  raw,
}: {
  raw: ListQueryInput;
}) {
  const students = await listActiveStudentsForSession();
  const flatParams: Record<string, string | undefined> = {
    tab: "riwayat",
    q: typeof raw.q === "string" ? raw.q : undefined,
    state: typeof raw.state === "string" ? raw.state : undefined,
    studentId: typeof raw.studentId === "string" ? raw.studentId : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    order: typeof raw.order === "string" ? raw.order : undefined,
  };

  return (
    <div className="flex flex-col gap-4">
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
      <Suspense
        key={filterCacheKey(raw)}
        fallback={<SessionListSkeleton />}
      >
        <SessionHistory raw={raw} flatParams={flatParams} />
      </Suspense>
    </div>
  );
}

async function SesiContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const rawSp = await searchParams;
  const raw = toInput(rawSp);
  const initialTab = parseTab(rawSp.tab);

  return (
    <SesiPageTabs
      initialTab={initialTab}
      mulai={
        initialTab === "mulai" ? (
          <Suspense
            fallback={
              <div
                className="h-56 animate-pulse rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white"
                aria-hidden
              />
            }
          >
            <MulaiPanel />
          </Suspense>
        ) : null
      }
      riwayat={initialTab === "riwayat" ? <RiwayatPanel raw={raw} /> : null}
    />
  );
}

export default function SesiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SesiShell>
      <Suspense fallback={<SesiBodySkeleton />}>
        <SesiContent searchParams={searchParams} />
      </Suspense>
    </SesiShell>
  );
}
