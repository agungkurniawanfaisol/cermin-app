import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Users,
  Volume2,
} from "lucide-react";
import { LandingPhotoCarousel } from "@/components/landing/landing-photo-carousel";

const CAROUSEL_SLIDES = [
  {
    src: "/images/landing/cermin-hero-storybook.jpg",
    alt: "Buku cerita bergambar terbuka di meja kayu dengan cahaya lembut",
    caption:
      "Cerita sosial disusun tenang — halaman demi halaman, tanpa rangsangan berlebih.",
  },
  {
    src: "/images/landing/cermin-care-together.jpg",
    alt: "Tangan orang dewasa menyusun kartu cerita sosial di meja terang",
    caption:
      "Terapis dan orang tua mendampingi bersama; anak fokus pada cerita, bukan login.",
  },
  {
    src: "/images/landing/cermin-session-calm.jpg",
    alt: "Suasana sesi belajar tenang dengan tablet menampilkan cerita lembut",
    caption:
      "Mode belajar dipandu orang dewasa — tenang, dapat diatur, tanpa skor kompetitif.",
  },
] as const;

const ROLES = [
  {
    title: "Administrator",
    body: "Kelola undangan pengguna, profil murid, penugasan terapis, dan alur publikasi cerita.",
    icon: Users,
  },
  {
    title: "Terapis",
    body: "Akses murid yang ditugaskan, susun cerita sosial, jalankan sesi, dan catat observasi.",
    icon: HeartHandshake,
  },
  {
    title: "Orang tua",
    body: "Lihat anak yang tertaut, dampingi sesi bersama, dan ikuti perkembangan belajar.",
    icon: BookOpen,
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Undang & tautkan",
    body: "Admin mengundang terapis/ortu, membuat profil murid, lalu menautkan penugasan.",
  },
  {
    n: "2",
    title: "Siapkan cerita",
    body: "Cerita disusun per halaman dengan teks, gambar, dan audio privat — lalu dipublikasikan.",
  },
  {
    n: "3",
    title: "Pandu sesi",
    body: "Orang dewasa membuka mode belajar bersama anak. Anak tidak perlu akun login.",
  },
] as const;

const SAFEGUARDS = [
  {
    title: "Media privat",
    body: "Gambar dan audio cerita tidak dipublikasikan permanen. Akses lewat URL bertanda tangan singkat setelah otorisasi.",
    icon: Lock,
  },
  {
    title: "Akses berbasis peran",
    body: "Terapis hanya melihat murid yang ditugaskan; ortu hanya anak tertaut. Aturan ditegakkan di server.",
    icon: ShieldCheck,
  },
  {
    title: "Mode anak tenang",
    body: "Tanpa skor kompetitif, tanpa autoplay, tipografi lega, dan gerak yang menghormati preferensi gerakan berkurang.",
    icon: Volume2,
  },
] as const;

function SectionHeading({
  id,
  title,
  lead,
}: {
  id: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 text-center">
      <h2
        id={id}
        className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl"
      >
        {title}
      </h2>
      <p className="text-base leading-relaxed text-[var(--cermin-muted)] sm:text-lg">
        {lead}
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing-root relative flex min-h-dvh flex-1 flex-col overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_15%_0%,var(--accent-soft)_0%,transparent_50%),radial-gradient(ellipse_60%_45%_at_95%_30%,color-mix(in_srgb,var(--cermin-accent)_10%,transparent)_0%,transparent_55%)]"
      />

      <header className="relative z-20 border-b border-[color-mix(in_srgb,var(--cermin-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--bg)_88%,white)]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <a
              href="#atas"
              className="text-base font-semibold tracking-wide text-[var(--cermin-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              CERMIN
            </a>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--cermin-accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Masuk
            </Link>
          </div>
          <nav
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 md:mx-0 md:overflow-visible"
            aria-label="Navigasi halaman"
          >
            {[
              { href: "#untuk-siapa", label: "Untuk siapa" },
              { href: "#cara-kerja", label: "Cara kerja" },
              { href: "#aman", label: "Keamanan" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-[var(--cermin-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <section
          id="atas"
          className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-8 sm:py-16 md:flex-row md:items-center md:gap-12 md:py-20"
        >
          <div className="landing-hero w-full min-w-0 flex-1 space-y-7 motion-safe:animate-[landing-rise_0.7s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none">
            <p className="text-5xl font-bold leading-[1.05] tracking-tight text-[var(--cermin-accent)] sm:text-6xl md:text-7xl">
              CERMIN
            </p>
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold leading-snug text-[var(--text)] sm:text-3xl md:text-4xl md:leading-tight">
                Cerita sosial dipandu — tenang untuk anak, jelas untuk lembaga
              </h1>
              <p className="text-base leading-relaxed text-[var(--cermin-muted)] sm:text-lg">
                CERita MIRip Aku membantu terapis dan orang tua mendampingi
                pembelajaran social story bersama anak autistik dalam satu sistem
                yang aman dan tenang.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/login"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--cermin-accent)] px-8 text-base font-medium text-white shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--cermin-accent)_50%,transparent)] transition-[transform,opacity] duration-200 hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] active:scale-[0.98] motion-reduce:active:scale-100 sm:w-auto"
              >
                Masuk ke dasbor
              </Link>
              <a
                href="#cara-kerja"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--cermin-border)] bg-[var(--surface)] px-6 text-base font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:w-auto"
              >
                Lihat cara kerja
              </a>
            </div>
            <p className="text-sm text-[var(--cermin-muted)]">
              Akun dibuat lewat undangan lembaga — bukan daftar mandiri.
            </p>
          </div>

          <figure className="relative w-full min-w-0 flex-1 overflow-hidden rounded-2xl md:max-w-none border border-[var(--cermin-border)] bg-[var(--surface)] shadow-[0_20px_50px_-28px_color-mix(in_srgb,var(--cermin-accent)_35%,transparent)]">
            <Image
              src="/images/landing/cermin-hero-storybook.jpg"
              alt="Buku cerita bergambar terbuka di meja kayu dengan cahaya lembut"
              width={960}
              height={720}
              priority
              className="aspect-[4/3] h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <figcaption className="border-t border-[var(--cermin-border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--cermin-muted)] sm:px-5">
              Cerita sosial disusun tenang — halaman demi halaman.
            </figcaption>
          </figure>
        </section>

        <section
          className="border-t border-[var(--cermin-border)] py-10 sm:py-14"
          aria-label="Galeri foto"
        >
          <LandingPhotoCarousel slides={[...CAROUSEL_SLIDES]} />
        </section>

        <section
          aria-labelledby="untuk-siapa"
          className="border-t border-[var(--cermin-border)] bg-[var(--surface)]"
        >
          <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-8 sm:py-20">
            <SectionHeading
              id="untuk-siapa"
              title="Untuk siapa"
              lead="Anak tidak punya akun. Orang dewasa yang berwenang membuka mode belajar dan memandu bersama."
            />
            <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8">
              {ROLES.map(({ title, body, icon: Icon }) => (
                <li key={title} className="space-y-3">
                  <div className="inline-flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--cermin-accent)]">
                    <Icon className="size-5" aria-hidden strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text)]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--cermin-muted)] sm:text-base">
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="cara-kerja"
          className="border-t border-[var(--cermin-border)]"
        >
          <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-8 sm:py-20">
            <SectionHeading
              id="cara-kerja"
              title="Cara kerja"
              lead="Alur sederhana dari undangan sampai sesi belajar yang tenang."
            />
            <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12">
              <ol className="grid gap-8">
                {STEPS.map((step) => (
                  <li key={step.n} className="flex gap-4 sm:gap-5">
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--cermin-accent)]"
                      aria-hidden
                    >
                      {step.n}
                    </span>
                    <div className="space-y-1 pt-1.5">
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-[var(--cermin-muted)] sm:text-base">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <figure className="overflow-hidden rounded-2xl border border-[var(--cermin-border)] bg-[var(--surface)]">
                <Image
                  src="/images/landing/cermin-session-calm.jpg"
                  alt="Suasana sesi belajar tenang dengan tablet menampilkan cerita lembut"
                  width={960}
                  height={720}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <figcaption className="border-t border-[var(--cermin-border)] px-4 py-3 text-sm text-[var(--cermin-muted)]">
                  Mode belajar: tenang, dipandu orang dewasa.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="aman"
          className="border-t border-[var(--cermin-border)] bg-[var(--surface)]"
        >
          <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-8 sm:py-20">
            <SectionHeading
              id="aman"
              title="Dirancang aman dan tenang"
              lead="Data anak, observasi, dan media diperlakukan sebagai informasi privat — bukan konten publik."
            />
            <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8">
              {SAFEGUARDS.map(({ title, body, icon: Icon }) => (
                <li key={title} className="space-y-3">
                  <div className="inline-flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--cermin-accent)]">
                    <Icon className="size-5" aria-hidden strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text)]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--cermin-muted)] sm:text-base">
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[var(--cermin-border)]">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-20">
            <div className="w-full min-w-0 flex-1 space-y-2">
              <h2 className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">
                Siap membuka dasbor?
              </h2>
              <p className="text-base text-[var(--cermin-muted)]">
                Masuk dengan akun yang diundang lembaga Anda.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--cermin-accent)] px-8 text-base font-medium text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:w-auto"
            >
              Masuk
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--cermin-border)] px-4 py-8 text-center sm:px-8">
        <p className="text-sm font-medium text-[var(--cermin-accent)]">
          CERMIN · CERita MIRip Aku
        </p>
        <p className="mt-1 text-sm text-[var(--cermin-muted)]">
          Pembelajaran social story yang tenang untuk anak autistik
        </p>
      </footer>
    </div>
  );
}
