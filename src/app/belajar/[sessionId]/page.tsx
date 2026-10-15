import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { SessionReader } from "@/components/belajar/session-reader";
import { AuthzError } from "@/server/policies/access";
import { getSessionForReader } from "@/server/actions/sessions";

export const instant = false;

async function BelajarSessionContent({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let session;
  try {
    session = await getSessionForReader(sessionId);
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 404) notFound();
      redirect("/dashboard/sesi");
    }
    throw error;
  }

  return <SessionReader session={session} />;
}

export default function BelajarSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-6 font-sans text-[var(--muted,#5c6b73)] sm:px-6 sm:py-8">
          Memuat cerita…
        </main>
      }
    >
      <BelajarSessionContent params={params} />
    </Suspense>
  );
}
