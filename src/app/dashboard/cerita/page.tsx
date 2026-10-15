import Link from "next/link";
import { requireSession } from "@/server/policies/access";
import {
  listActiveCategories,
  listStoriesByCategory,
} from "@/server/actions/stories";
import { CreateStoryForm } from "./create-story-form";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

export default async function CeritaPage() {
  const user = await requireSession();
  const canManage = user.role === "ADMIN" || user.role === "TERAPIS";
  const categories = await listStoriesByCategory();
  const activeCategories = canManage ? await listActiveCategories() : [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Cerita
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#5c6b73)]">
        {user.role === "ORANG_TUA"
          ? "Cerita yang sudah diterbitkan."
          : "Kelola cerita sosial berdasarkan kategori dan alur status."}
      </p>

      {canManage ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
            Buat cerita baru
          </h2>
          <CreateStoryForm categories={activeCategories} />
        </section>
      ) : null}

      <section className="mt-10 space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
              {category.name}
            </h2>
            {category.description ? (
              <p className="text-sm text-[var(--muted,#5c6b73)]">
                {category.description}
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-xl border border-[var(--border,#d9e2ec)] bg-white">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Judul</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pembuat</th>
                  </tr>
                </thead>
                <tbody>
                  {category.stories.map((story) => (
                    <tr
                      key={story.id}
                      className="border-b border-[var(--border,#d9e2ec)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/cerita/${story.id}`}
                          className="font-medium text-[var(--accent,#3d7c6b)] hover:underline"
                        >
                          {story.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {STATUS_LABEL[story.status] ?? story.status}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted,#5c6b73)]">
                        {story.createdBy.name}
                      </td>
                    </tr>
                  ))}
                  {category.stories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-[var(--muted,#5c6b73)]"
                      >
                        Belum ada cerita di kategori ini.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {categories.length === 0 ? (
          <p className="text-sm text-[var(--muted,#5c6b73)]">
            Belum ada kategori cerita. Jalankan seed database.
          </p>
        ) : null}
      </section>
    </main>
  );
}
