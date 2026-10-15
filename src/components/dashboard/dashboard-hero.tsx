import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  TERAPIS: "Terapis",
  ORANG_TUA: "Orang tua",
};

type DashboardHeroProps = {
  name: string;
  role: string;
  dateLabel: string;
};

export function DashboardHero({ name, role, dateLabel }: DashboardHeroProps) {
  const roleLabel = ROLE_LABEL[role] ?? role;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[var(--cermin-border,#d9e2ec)] bg-gradient-to-br from-[var(--accent-soft,#e6f2ee)] via-white to-[var(--bg,#f7f4ef)] px-5 py-6 sm:px-6 sm:py-8"
      aria-labelledby="dashboard-hero-title"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[var(--cermin-accent,#3d7c6b)]/10 motion-safe:transition-opacity"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-[var(--cermin-accent,#3d7c6b)]/5"
        aria-hidden
      />

      <p className="relative text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
        CERMIN · Dasbor dewasa
      </p>
      <h1
        id="dashboard-hero-title"
        className="relative mt-2 w-full text-3xl font-semibold leading-tight text-[var(--text,#1f2933)] sm:text-4xl"
      >
        Selamat datang, {name}
      </h1>
      <p className="relative mt-3 w-full text-base leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
        Anda masuk sebagai{" "}
        <span className="font-medium text-[var(--text,#1f2933)]">{roleLabel}</span>
        {" · "}
        {dateLabel}
      </p>
      <p className="relative mt-2 w-full text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
        Kelola murid, cerita sosial, dan sesi belajar dipandu. Mode anak ada di
        halaman Sesi — terpisah dari dasbor ini.
      </p>

      <div className="relative mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/sesi"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "h-12 min-w-[11rem] cursor-pointer gap-2 px-5 text-base",
          )}
        >
          <BookOpenCheck className="size-5" aria-hidden />
          Mulai sesi belajar
        </Link>
        <Link
          href="/dashboard/murid"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-12 cursor-pointer border-[var(--cermin-border,#d9e2ec)] bg-white/80 px-5 text-base",
          )}
        >
          Lihat murid
        </Link>
      </div>
    </section>
  );
}
