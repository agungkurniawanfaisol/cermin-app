import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  AuthzError,
  requireSession,
} from "@/server/policies/access";
import { getStudentDetail } from "@/server/actions/students";
import { AssignTherapistForm } from "./assign-therapist-form";
import { LinkParentForm } from "./link-parent-form";
import {
  EndAssignmentButton,
  UnlinkParentButton,
} from "./assignment-actions";
import { ArchiveStudentButton } from "./archive-student-button";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  ARCHIVED: "Arsip",
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: Date): string {
  return value.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MuridDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();
  const isAdmin = user.role === "ADMIN";

  let student;
  try {
    student = await getStudentDetail(id);
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 404) notFound();
      redirect("/dashboard/murid");
    }
    throw error;
  }

  const [therapists, parents] = isAdmin
    ? await Promise.all([
        prisma.user.findMany({
          where: { role: UserRole.TERAPIS, status: UserStatus.ACTIVE },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          where: { role: UserRole.ORANG_TUA, status: UserStatus.ACTIVE },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  const activeLinks = student.parentLinks.filter((l) => l.isActive);
  const inactiveLinks = student.parentLinks.filter((l) => !l.isActive);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-10">
      <div>
        <Link
          href="/dashboard/murid"
          className="text-sm text-[var(--accent,#3d7c6b)] hover:underline"
        >
          ← Kembali ke daftar murid
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
              CERMIN
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
              {student.displayName}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted,#5c6b73)]">
              Status: {STATUS_LABEL[student.status] ?? student.status} · Lahir:{" "}
              {formatDate(student.dateOfBirth)}
            </p>
          </div>
          {isAdmin && student.status === "ACTIVE" ? (
            <ArchiveStudentButton studentId={student.id} />
          ) : null}
        </div>
      </div>

      <section className="space-y-2 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Profil
        </h2>
        {isAdmin && student.adminNotes ? (
          <p className="whitespace-pre-wrap text-sm text-[var(--text,#1f2933)]">
            <span className="font-medium">Catatan admin: </span>
            {student.adminNotes}
          </p>
        ) : isAdmin ? (
          <p className="text-sm text-[var(--muted,#5c6b73)]">
            Belum ada catatan admin.
          </p>
        ) : (
          <p className="text-sm text-[var(--muted,#5c6b73)]">
            Profil murid yang dapat Anda akses.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Riwayat penugasan terapis
        </h2>
        {isAdmin ? (
          <div className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4">
            <p className="mb-3 text-sm font-medium text-[var(--text,#1f2933)]">
              Tugaskan terapis
            </p>
            <AssignTherapistForm studentId={student.id} therapists={therapists} />
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-xl border border-[var(--border,#d9e2ec)] bg-white">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
              <tr>
                <th className="px-4 py-3 font-medium">Terapis</th>
                <th className="px-4 py-3 font-medium">Mulai</th>
                <th className="px-4 py-3 font-medium">Selesai</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin ? (
                  <th className="px-4 py-3 font-medium">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {student.therapistAssignments.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text,#1f2933)]">
                      {a.therapist.name}
                    </div>
                    <div className="text-xs text-[var(--muted,#5c6b73)]">
                      {a.therapist.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted,#5c6b73)]">
                    {formatDateTime(a.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted,#5c6b73)]">
                    {a.endedAt ? formatDateTime(a.endedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.endedAt ? "Selesai" : "Aktif"}
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {!a.endedAt ? (
                        <EndAssignmentButton assignmentId={a.id} />
                      ) : (
                        <span className="text-[var(--muted,#5c6b73)]">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {student.therapistAssignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="px-4 py-6 text-center text-[var(--muted,#5c6b73)]"
                  >
                    Belum ada penugasan terapis.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Orang tua tertaut
        </h2>
        {isAdmin ? (
          <div className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4">
            <p className="mb-3 text-sm font-medium text-[var(--text,#1f2933)]">
              Tautkan orang tua
            </p>
            <LinkParentForm studentId={student.id} parents={parents} />
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-xl border border-[var(--border,#d9e2ec)] bg-white">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Hubungan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin ? (
                  <th className="px-4 py-3 font-medium">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {[...activeLinks, ...inactiveLinks].map((link) => (
                <tr
                  key={link.id}
                  className="border-b border-[var(--border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text,#1f2933)]">
                      {link.parent.name}
                    </div>
                    <div className="text-xs text-[var(--muted,#5c6b73)]">
                      {link.parent.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted,#5c6b73)]">
                    {link.relationLabel || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {link.isActive ? "Aktif" : "Nonaktif"}
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {link.isActive ? (
                        <UnlinkParentButton linkId={link.id} />
                      ) : (
                        <span className="text-[var(--muted,#5c6b73)]">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {student.parentLinks.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-6 text-center text-[var(--muted,#5c6b73)]"
                  >
                    Belum ada orang tua tertaut.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
