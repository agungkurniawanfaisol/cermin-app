import { redirect } from "next/navigation";
import { AuthzError, requireSession } from "@/server/policies/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof AuthzError && error.status === 401) {
      redirect("/login");
    }
    if (error instanceof AuthzError && error.status === 403) {
      redirect("/login");
    }
    throw error;
  }

  return <div className="min-h-full flex flex-col bg-[var(--bg,#f7f4ef)]">{children}</div>;
}
