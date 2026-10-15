import { listStudentsForViewer } from "@/server/actions/students";
import { listPublishedStoriesForSession } from "@/server/actions/sessions";
import { requireSession } from "@/server/policies/access";
import { StartSessionForm } from "./start-session-form";

export default async function SesiPage() {
  await requireSession();
  const [students, stories] = await Promise.all([
    listStudentsForViewer(),
    listPublishedStoriesForSession(),
  ]);

  const activeStudents = students.filter((s) => s.status === "ACTIVE");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Sesi belajar
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#5c6b73)]">
        Pilih murid dan cerita terbit, lalu buka mode anak untuk belajar
        bersama.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Mulai sesi baru
        </h2>
        <StartSessionForm
          students={activeStudents.map((s) => ({
            id: s.id,
            displayName: s.displayName,
          }))}
          stories={stories}
        />
      </section>
    </main>
  );
}
