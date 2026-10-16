import Link from "next/link";
import { StoryStatus } from "@prisma/client";
import { ListFilters } from "@/components/dashboard/list-filters";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { StoryList } from "@/components/dashboard/story-list";
import type { ListQueryInput } from "@/lib/list-query";
import {
  canEditStoryContent,
  requireSession,
} from "@/server/policies/access";
import {
  listCategoriesForFilter,
  listStoriesForViewer,
} from "@/server/actions/stories";

export const instant = false;

function toInput(
  sp: Record<string, string | string[] | undefined>,
): ListQueryInput {
  return sp;
}

async function CeritaContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const canManage = user.role === "ADMIN" || user.role === "TERAPIS";
  const raw = toInput(await searchParams);

  const [result, categoryOptions] = await Promise.all([
    listStoriesForViewer(raw),
    listCategoriesForFilter(),
  ]);

  const flatParams: Record<string, string | undefined> = {
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : undefined,
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
            Cerita
          </h1>
          <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
            {user.role === "ORANG_TUA"
              ? "Cerita yang sudah diterbitkan. Buka detail untuk pratinjau singkat."
              : "Kelola cerita sosial. Buka Detail untuk ringkasan dan pratinjau halaman, atau lanjutkan ke editor."}
          </p>
        </div>
        {canManage ? (
          <Link
            href="/dashboard/cerita/baru"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
          >
            Buat cerita
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <ListFilters
          searchPlaceholder="Cari judul cerita…"
          defaultSortValue="updatedAt:desc"
          filters={[
            ...(canManage
              ? [
                  {
                    name: "status",
                    label: "Status",
                    allLabel: "Semua status",
                    options: [
                      { value: "DRAFT", label: "Draf" },
                      { value: "REVIEW", label: "Review" },
                      { value: "APPROVED", label: "Disetujui" },
                      { value: "PUBLISHED", label: "Terbit" },
                      { value: "ARCHIVED", label: "Arsip" },
                    ],
                  },
                ]
              : []),
            {
              name: "categoryId",
              label: "Kategori",
              allLabel: "Semua kategori",
              options: categoryOptions.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            },
          ]}
          sortOptions={[
            { value: "updatedAt:desc", label: "Terbaru diubah" },
            { value: "updatedAt:asc", label: "Terlama diubah" },
            { value: "title:asc", label: "Judul A→Z" },
            { value: "title:desc", label: "Judul Z→A" },
            { value: "createdAt:desc", label: "Terbaru dibuat" },
            { value: "createdAt:asc", label: "Terlama dibuat" },
          ]}
        />
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Daftar cerita
        </h2>
        <StoryList
          stories={result.items.map((story) => {
            const editable = canEditStoryContent(user, {
              status: story.status,
              createdById: story.createdBy.id,
            });
            const continuePrimary = editable;
            const continueLabel =
              editable && story.status === StoryStatus.DRAFT
                ? "Lanjutkan draf"
                : editable
                  ? "Lanjutkan"
                  : "Lihat cerita";
            return { ...story, continueLabel, continuePrimary };
          })}
          canManage={canManage}
        />
        <ListPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          searchParams={flatParams}
          basePath="/dashboard/cerita"
        />
      </section>
    </main>
  );
}

export default async function CeritaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CeritaContent searchParams={searchParams} />;
}
