import { Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Users,
  UserCog,
} from "lucide-react";
import { ActionCard } from "@/components/dashboard/action-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { NextStepTip } from "@/components/dashboard/next-step-tip";
import { SummaryStat } from "@/components/dashboard/summary-stat";
import { formatDateId, formatDateTimeId } from "@/lib/format-date";
import { getDashboardSummary } from "@/server/queries/dashboard";

export const instant = false;

function studentStatLabel(role: string): string {
  if (role === "ADMIN") return "Murid aktif";
  if (role === "TERAPIS") return "Murid ditugaskan";
  return "Anak terhubung";
}

function DashboardFallback() {
  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat dasbor…</p>
    </main>
  );
}

async function DashboardHome() {
  const summary = await getDashboardSummary();
  const { user } = summary;
  const isAdmin = user.role === "ADMIN";

  return (
    <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div className="flex flex-col gap-8">
        <DashboardHero
          name={user.name}
          role={user.role}
          dateLabel={formatDateId(new Date())}
        />

        <section aria-labelledby="dashboard-stats-heading">
          <h2 id="dashboard-stats-heading" className="sr-only">
            Ringkasan
          </h2>
          <div
            className={
              isAdmin
                ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            <SummaryStat
              label={studentStatLabel(user.role)}
              value={summary.studentCount}
              hint={
                summary.studentCount === 0
                  ? "Belum ada data murid untuk peran Anda"
                  : undefined
              }
            />
            <SummaryStat
              label="Cerita dipublikasikan"
              value={summary.publishedStoryCount}
              hint={
                summary.publishedStoryCount === 0
                  ? "Belum ada cerita siap dipakai"
                  : undefined
              }
            />
            <SummaryStat
              label="Sesi 7 hari terakhir"
              value={summary.sessionsLast7Days}
              hint={
                summary.sessionsLast7Days === 0
                  ? "Belum ada sesi minggu ini"
                  : undefined
              }
            />
            {isAdmin && summary.pendingInvites !== null ? (
              <SummaryStat
                label="Undangan menunggu"
                value={summary.pendingInvites}
                hint={
                  summary.pendingInvites === 0
                    ? "Tidak ada undangan aktif"
                    : undefined
                }
              />
            ) : null}
          </div>
        </section>

        <NextStepTip tip={summary.tip} />

        <section aria-labelledby="dashboard-actions-heading">
          <h2
            id="dashboard-actions-heading"
            className="text-lg font-semibold text-[var(--text,#1f2933)]"
          >
            Pintasan
          </h2>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Buka area kerja yang paling sering dipakai.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/dashboard/murid"
              title="Murid"
              description={
                user.role === "ORANG_TUA"
                  ? "Lihat anak yang terhubung dengan akun Anda."
                  : "Kelola profil murid dan penugasan."
              }
              icon={Users}
            />
            <ActionCard
              href="/dashboard/cerita"
              title="Cerita"
              description="Baca dan kelola cerita sosial untuk sesi belajar."
              icon={BookOpen}
            />
            <ActionCard
              href="/dashboard/sesi"
              title="Sesi"
              description="Mulai sesi dipandu atau tinjau riwayat singkat."
              icon={ClipboardList}
            />
            {isAdmin ? (
              <ActionCard
                href="/dashboard/pengguna"
                title="Pengguna"
                description="Undang terapis atau orang tua, kelola undangan."
                icon={UserCog}
              />
            ) : null}
          </div>
        </section>

        <section aria-labelledby="dashboard-recent-heading">
          <h2
            id="dashboard-recent-heading"
            className="text-lg font-semibold text-[var(--text,#1f2933)]"
          >
            Sesi terbaru
          </h2>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Tiga sesi terakhir yang relevan dengan peran Anda.
          </p>

          {summary.recentSessions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-white/70 px-5 py-8 text-center">
              <p className="text-base font-medium text-[var(--text,#1f2933)]">
                Belum ada sesi
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)]">
                Mulai sesi pertama dari halaman Sesi setelah murid dan cerita
                siap.
              </p>
              <Link
                href="/dashboard/sesi"
                className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              >
                Buka halaman Sesi
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--cermin-border,#d9e2ec)] overflow-hidden rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white">
              {summary.recentSessions.map((session) => (
                <li key={session.id} className="px-4 py-3">
                  <p className="font-medium text-[var(--text,#1f2933)]">
                    {session.storyTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
                    {session.studentName}
                    {" · "}
                    {formatDateTimeId(session.startedAt)}
                    {session.endedAt ? " · selesai" : " · berlangsung"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardHome />
    </Suspense>
  );
}
