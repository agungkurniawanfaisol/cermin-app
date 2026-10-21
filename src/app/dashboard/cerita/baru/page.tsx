import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthzError, requireSession } from "@/server/policies/access";
import { listActiveCategories } from "@/server/actions/stories";
import { CreateStoryForm } from "../create-story-form";


async function BuatCeritaContent() {
  let user;
  try {
    user = await requireSession();
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect("/login");
    }
    throw error;
  }

  if (user.role !== "ADMIN" && user.role !== "TERAPIS") {
    redirect("/dashboard/cerita");
  }

  const categories = await listActiveCategories();

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text,#1f2933)] sm:text-3xl">
            Buat cerita sosial
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--cermin-muted,#5c6b73)]">
            Mulai dari identitas draf. Langkah berikutnya — halaman, media,
            soal per halaman, dan penerbitan — dibuka di editor bertahap.
          </p>
        </div>
        <Link
          href="/dashboard/cerita"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 text-sm font-medium text-[var(--text,#1f2933)] transition-colors hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
        >
          Kembali ke daftar
        </Link>
      </div>

      <section className="mt-8 w-full">
        <CreateStoryForm categories={categories} />
      </section>
    </main>
  );
}

export default async function BuatCeritaPage() {
  return (
    <BuatCeritaContent />
  );
}
