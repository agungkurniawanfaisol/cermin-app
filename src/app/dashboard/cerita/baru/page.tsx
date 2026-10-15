import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthzError, requireSession } from "@/server/policies/access";
import { listActiveCategories } from "@/server/actions/stories";
import { CreateStoryForm } from "../create-story-form";

export const instant = false;

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
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
            Buat cerita
          </h1>
          <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Buat draf cerita sosial. Setelah tersimpan, Anda bisa menambah
            halaman dan media.
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

export default function BuatCeritaPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
          <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat formulir…</p>
        </main>
      }
    >
      <BuatCeritaContent />
    </Suspense>
  );
}
