import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";
import { PageLoading } from "@/components/ui/page-loading";
import { getBrandingPublic } from "@/server/queries/branding";

export const metadata: Metadata = {
  title: "CERMIN — CERita MIRip Aku",
  description:
    "Platform lembaga untuk social story tenang: murid, cerita privat, sesi dipandu, dan observasi untuk anak autistik.",
};

async function HomeGate(): Promise<React.ReactNode> {
  const [session, branding] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getBrandingPublic(),
  ]);
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage branding={branding} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <PageLoading
          message="Memuat…"
          variant="belajar"
          className="min-h-dvh bg-[var(--bg,#f7f4ef)]"
        />
      }
    >
      <HomeGate />
    </Suspense>
  );
}
