import { notFound, redirect } from "next/navigation";
import { SessionReader } from "@/components/belajar/session-reader";
import { AuthzError } from "@/server/policies/access";
import { getSessionForReader } from "@/server/actions/sessions";

export default async function BelajarSessionPage({
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
