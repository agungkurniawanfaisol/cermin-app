import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthzError, requireSession } from "@/server/policies/access";
import { listPublishedStoriesForSession } from "@/server/actions/sessions";
import { listActiveStudentsForSession } from "@/server/actions/students";
import { SessionStartFlow } from "@/app/dashboard/sesi/session-start-flow";

export const instant = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function MulaiSesiContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof AuthzError) redirect("/login");
    throw error;
  }

  const sp = await searchParams;
  const rawStudent =
    typeof sp.studentId === "string"
      ? sp.studentId
      : Array.isArray(sp.studentId)
        ? (sp.studentId[0] ?? "")
        : "";

  const [students, stories] = await Promise.all([
    listActiveStudentsForSession(),
    listPublishedStoriesForSession(),
  ]);

  if (students.length === 0) {
    redirect("/dashboard/sesi");
  }

  const initialStudentId =
    UUID_RE.test(rawStudent) && students.some((s) => s.id === rawStudent)
      ? rawStudent
      : undefined;

  return (
    <SessionStartFlow
      students={students}
      stories={stories}
      initialStudentId={initialStudentId}
      fullscreen
    />
  );
}

export default function MulaiSesiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center px-4 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Memuat pilihan cerita…
        </div>
      }
    >
      <MulaiSesiContent searchParams={searchParams} />
    </Suspense>
  );
}
