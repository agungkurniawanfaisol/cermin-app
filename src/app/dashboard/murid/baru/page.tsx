import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthzError, requireRole } from "@/server/policies/access";
import { CreateStudentForm } from "../create-student-form";

export const instant = false;

async function TambahMuridContent() {
  try {
    await requireRole("ADMIN");
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect("/dashboard/murid");
    }
    throw error;
  }

  const parents = await prisma.user.findMany({
    where: { role: UserRole.ORANG_TUA, status: UserStatus.ACTIVE },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
            Tambah murid
          </h1>
          <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Isi profil murid. Setelah disimpan, Anda bisa menambahkan foto dan
            penugasan.
          </p>
        </div>
        <Link
          href="/dashboard/murid"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 text-sm font-medium text-[var(--text,#1f2933)] transition-colors hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
        >
          Kembali ke daftar
        </Link>
      </div>

      <section className="mt-8 w-full">
        <CreateStudentForm parents={parents} />
      </section>
    </main>
  );
}

export default function TambahMuridPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
          <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat formulir…</p>
        </main>
      }
    >
      <TambahMuridContent />
    </Suspense>
  );
}
