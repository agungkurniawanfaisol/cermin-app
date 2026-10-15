"use client";

import Link from "next/link";
import type { ListedStudent } from "@/server/actions/students";
import { DeleteStudentDialog } from "@/components/dashboard/delete-student-dialog";
import { formatDateShortId } from "@/lib/format-date";
import { cn } from "cn";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  ARCHIVED: "Arsip",
};

function formatDob(value: Date | null): string {
  if (!value) return "—";
  return formatDateShortId(value);
}

function StatusBadge({ status }: { status: string }) {
  const archived = status === "ARCHIVED";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        archived
          ? "bg-[var(--bg,#f7f4ef)] text-[var(--cermin-muted,#5c6b73)] ring-1 ring-[var(--cermin-border,#d9e2ec)]"
          : "bg-[var(--accent-soft,#e6f2ee)] text-[var(--focus,#0b6e4f)] ring-1 ring-[var(--cermin-accent,#3d7c6b)]/20",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

type Props = {
  students: ListedStudent[];
  isAdmin: boolean;
};

export function StudentList({ students, isAdmin }: Props) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-10 text-center">
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Tidak ada murid yang cocok dengan filter.
          {isAdmin ? (
            <>
              {" "}
              <Link
                href="/dashboard/murid/baru"
                className="font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
              >
                Buat murid
              </Link>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <ul className="grid gap-3 lg:hidden" aria-label="Daftar murid">
        {students.map((student) => {
          const canDelete = isAdmin && student.status === "ACTIVE";
          return (
            <li key={student.id}>
              <article className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 shadow-[0_1px_2px_rgba(31,41,51,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/murid/${student.id}`}
                      className="block truncate text-base font-semibold text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
                    >
                      {student.displayName}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-[var(--cermin-muted,#5c6b73)]">
                      {student.fullName || "Tanpa nama lengkap"}
                    </p>
                  </div>
                  <StatusBadge status={student.status} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      Telepon
                    </dt>
                    <dd className="text-[var(--text,#1f2933)]">
                      {student.phone || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      Lahir
                    </dt>
                    <dd className="text-[var(--text,#1f2933)]">
                      {formatDob(student.dateOfBirth)}
                    </dd>
                  </div>
                </dl>

                {student.status === "ARCHIVED" && student.archivedReason ? (
                  <p className="mt-3 rounded-lg bg-[var(--bg,#f7f4ef)] px-3 py-2 text-xs leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
                    <span className="font-medium text-[var(--text,#1f2933)]">
                      Alasan:{" "}
                    </span>
                    {student.archivedReason}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--cermin-border,#d9e2ec)] pt-3">
                  <Link
                    href={`/dashboard/murid/${student.id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-3 text-sm font-medium text-[var(--text,#1f2933)] transition-colors hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
                  >
                    Lihat profil
                  </Link>
                  {canDelete ? (
                    <DeleteStudentDialog
                      studentId={student.id}
                      displayName={student.displayName}
                      variant="button"
                    />
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] lg:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--text,#1f2933)]">
                Panggilan
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text,#1f2933)]">
                Nama lengkap
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text,#1f2933)]">
                Telepon
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text,#1f2933)]">
                Tanggal lahir
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text,#1f2933)]">
                Status
              </th>
              {isAdmin ? (
                <th className="px-4 py-3 text-right font-medium text-[var(--text,#1f2933)]">
                  Aksi
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const canDelete = isAdmin && student.status === "ACTIVE";
              return (
                <tr
                  key={student.id}
                  className="border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/murid/${student.id}`}
                      className="font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
                    >
                      {student.displayName}
                    </Link>
                    {student.status === "ARCHIVED" &&
                    student.archivedReason ? (
                      <p
                        className="mt-1 max-w-[14rem] truncate text-xs text-[var(--cermin-muted,#5c6b73)]"
                        title={student.archivedReason}
                      >
                        {student.archivedReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                    {student.fullName || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                    {student.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                    {formatDob(student.dateOfBirth)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={student.status} />
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3 text-right">
                      {canDelete ? (
                        <div className="inline-flex justify-end">
                          <DeleteStudentDialog
                            studentId={student.id}
                            displayName={student.displayName}
                            variant="icon"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                          —
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
