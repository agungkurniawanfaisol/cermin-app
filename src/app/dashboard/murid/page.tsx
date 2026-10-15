import Link from "next/link";
import { requireSession } from "@/server/policies/access";
import { listStudentsForViewer } from "@/server/actions/students";
import { CreateStudentForm } from "./create-student-form";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  ARCHIVED: "Arsip",
};

function formatDob(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function MuridPage() {
  const user = await requireSession();
  const students = await listStudentsForViewer();
  const isAdmin = user.role === "ADMIN";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Murid
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#5c6b73)]">
        {isAdmin
          ? "Kelola profil murid, penugasan terapis, dan tautan orang tua."
          : "Daftar murid yang dapat Anda akses."}
      </p>

      {isAdmin ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
            Tambah murid
          </h2>
          <CreateStudentForm />
        </section>
      ) : null}

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Daftar murid
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border,#d9e2ec)] bg-white">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Tanggal lahir</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-[var(--border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/murid/${student.id}`}
                      className="font-medium text-[var(--accent,#3d7c6b)] hover:underline"
                    >
                      {student.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted,#5c6b73)]">
                    {formatDob(student.dateOfBirth)}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABEL[student.status] ?? student.status}
                  </td>
                </tr>
              ))}
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-[var(--muted,#5c6b73)]"
                  >
                    Belum ada murid.
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
