import { Suspense } from "react";
import { requireSession } from "@/server/policies/access";
import { listFaqsForViewer } from "@/server/actions/faqs";
import { listGuidesForViewer } from "@/server/actions/guides";
import { BantuanTabs } from "./bantuan-tabs";

export const instant = false;

async function BantuanContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const sp = await searchParams;
  const tabRaw = typeof sp.tab === "string" ? sp.tab : "faq";
  const tab = tabRaw === "petunjuk" ? "petunjuk" : "faq";

  const [faqs, guides] = await Promise.all([
    listFaqsForViewer(),
    listGuidesForViewer(),
  ]);

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
        Bantuan
      </h1>
      <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
        FAQ dan petunjuk penggunaan.
      </p>
      <div className="mt-6">
        <BantuanTabs
          initialTab={tab}
          faqs={faqs}
          guides={guides}
          isAdmin={user.role === "ADMIN"}
        />
      </div>
    </main>
  );
}

export default function BantuanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
          <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat bantuan…</p>
        </main>
      }
    >
      <BantuanContent searchParams={searchParams} />
    </Suspense>
  );
}
