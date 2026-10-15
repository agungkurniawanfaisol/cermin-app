import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "CERMIN — CERita MIRip Aku",
  description:
    "Platform lembaga untuk social story tenang: murid, cerita privat, sesi dipandu, dan observasi untuk anak autistik.",
};

async function HomeGate(): Promise<React.ReactNode> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-[var(--bg,#f7f4ef)] p-8 font-sans text-[var(--muted,#5c6b73)]">
          Memuat…
        </main>
      }
    >
      <HomeGate />
    </Suspense>
  );
}
