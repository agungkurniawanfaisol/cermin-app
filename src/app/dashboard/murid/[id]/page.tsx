import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  AuthzError,
  requireSession,
} from "@/server/policies/access";
import { getStudentDetail } from "@/server/actions/students";
import { StudentAvatarUploader } from "@/components/dashboard/student-avatar-uploader";
import { AssignTherapistForm } from "./assign-therapist-form";
import { EditStudentProfileForm } from "./edit-student-profile-form";
import { LinkParentForm } from "./link-parent-form";
import {
  EndAssignmentButton,
  UnlinkParentButton,
} from "./assignment-actions";
import { ArchiveStudentButton } from "./archive-student-button";
import { formatDateLongId, formatDateTimeId } from "@/lib/format-date";


const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  ARCHIVED: "Arsip",
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return formatDateLongId(value);
}

function formatDateTime(value: Date): string {
  return formatDateTimeId(value);
}

async function MuridDetailContent({ id }: { id: string }) {
  const user = await requireSession();
  const isAdmin = user.role === "ADMIN";

  let student;
  let therapists: Array<{ id: string; name: string; email: string }> = [];
  let parents: Array<{ id: string; name: string; email: string }> = [];
  let personalizedMedia: Array<{
    id: string;
    kind: string;
    altText: string | null;
    story: {
      id: string;
      title: string;
      status: string;
      category: { name: string };
    } | null;
    page: { sortOrder: number } | null;
  }> = [];
  try {
    const [
      studentResult,
      therapistResult,
      parentResult,
      personalizedMediaResult,
    ] = await Promise.all([
      getStudentDetail(id),
      isAdmin
        ? prisma.user.findMany({
            where: { role: UserRole.TERAPIS, status: UserStatus.ACTIVE },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.user.findMany({
            where: { role: UserRole.ORANG_TUA, status: UserStatus.ACTIVE },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      prisma.mediaAsset.findMany({
        where: { studentId: id },
        select: {
          id: true,
          kind: true,
          altText: true,
          story: {
            select: {
              id: true,
              title: true,
              status: true,
              category: { select: { name: true } },
            },
          },
          page: {
            select: {
              sortOrder: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    student = studentResult;
    therapists = therapistResult;
    parents = parentResult;
    personalizedMedia = personalizedMediaResult;
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 404) notFound();
      redirect("/dashboard/murid");
    }
    throw error;
  }

  const activeLinks = student.parentLinks.filter((l) => l.isActive);
  const inactiveLinks = student.parentLinks.filter((l) => !l.isActive);

  const storyMap = new Map<
    string,
    {
      id: string;
      title: string;
      status: string;
      categoryName: string;
      mediaCount: number;
    }
  >();
  for (const m of personalizedMedia) {
    if (!m.story) continue;
    const existing = storyMap.get(m.story.id);
    if (existing) {
      existing.mediaCount += 1;
    } else {
      storyMap.set(m.story.id, {
        id: m.story.id,
        title: m.story.title,
        status: m.story.status,
        categoryName: m.story.category.name,
        mediaCount: 1,
      });
    }
  }
  const personalizedStories = Array.from(storyMap.values());
  return (
    <main className="w-full flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div>
        <Link
          href="/dashboard/murid"
          className="text-sm text-[var(--accent,#3d7c6b)] hover:underline"
        >
          ← Kembali ke daftar murid
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
              CERMIN
            </p>
            <h1 className="text-3xl font-semibold text-[var(--text,#1f2933)]">
              {student.displayName}
            </h1>
            {student.fullName ? (
              <p className="text-base text-[var(--cermin-muted,#5c6b73)]">
                {student.fullName}
              </p>
            ) : null}
            <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
              Status: {STATUS_LABEL[student.status] ?? student.status} · Lahir:{" "}
              {formatDate(student.dateOfBirth)}
              {student.phone ? ` · ${student.phone}` : ""}
            </p>
          </div>
          {isAdmin && student.status === "ACTIVE" ? (
            <ArchiveStudentButton
              studentId={student.id}
              displayName={student.displayName}
            />
          ) : null}
        </div>

        <section
          className="mt-6 space-y-3"
          aria-labelledby="foto-profil-keluarga-heading"
        >
          <div>
            <h2
              id="foto-profil-keluarga-heading"
              className="text-lg font-semibold text-[var(--text,#1f2933)]"
            >
              Foto profil keluarga
            </h2>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Foto murid, ayah, dan ibu untuk identitas di profil. Semua
              opsional; bukan foto akun login orang tua.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StudentAvatarUploader
              studentId={student.id}
              label="Foto murid"
              hint="Opsional · dipakai di daftar & child mode"
              displayName={student.displayName}
              slot="murid"
              hasImage={Boolean(student.imageKey)}
              canUpload={student.status === "ACTIVE"}
            />
            <StudentAvatarUploader
              studentId={student.id}
              label="Foto ayah"
              hint="Opsional"
              displayName="Ayah"
              slot="ayah"
              hasImage={Boolean(student.fatherImageKey)}
              canUpload={student.status === "ACTIVE"}
            />
            <StudentAvatarUploader
              studentId={student.id}
              label="Foto ibu"
              hint="Opsional"
              displayName="Ibu"
              slot="ibu"
              hasImage={Boolean(student.motherImageKey)}
              canUpload={student.status === "ACTIVE"}
            />
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Data diri
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Nama lengkap</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.fullName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Nama panggilan</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.displayName}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Tanggal lahir</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {formatDate(student.dateOfBirth)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Nomor telepon</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.phone || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Alamat rumah</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.homeAddress || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">RT</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.rt || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">RW</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.rw || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Kontak darurat</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.emergencyContactName || "—"}
              {student.emergencyContactPhone
                ? ` · ${student.emergencyContactPhone}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Bahasa di rumah</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.homeLanguage || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Preferensi sensorik</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {[
                student.preferQuiet ? "Lingkungan tenang" : null,
                student.preferDimLight ? "Cahaya redup" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
              {student.sensoryNotes ? (
                <span className="mt-1 block font-normal text-[var(--cermin-muted,#5c6b73)]">
                  {student.sensoryNotes}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cermin-muted,#5c6b73)]">Foto wajib sebelum sesi</dt>
            <dd className="font-medium text-[var(--text,#1f2933)]">
              {student.requirePhotoForSession ? "Ya" : "Tidak"}
              {student.requirePhotoForSession && !student.imageKey ? (
                <span className="mt-1 block text-sm font-normal text-[var(--danger,#9b2c2c)]">
                  Belum ada foto — unggah sebelum memulai sesi.
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        {isAdmin && student.allergies ? (
          <p className="whitespace-pre-wrap border-t border-[var(--cermin-border,#d9e2ec)] pt-3 text-sm text-[var(--text,#1f2933)]">
            <span className="font-medium">Alergi / catatan medis: </span>
            {student.allergies}
          </p>
        ) : null}
        {isAdmin && student.adminNotes ? (
          <p className="whitespace-pre-wrap border-t border-[var(--cermin-border,#d9e2ec)] pt-3 text-sm text-[var(--text,#1f2933)]">
            <span className="font-medium">Catatan admin: </span>
            {student.adminNotes}
          </p>
        ) : null}
      </section>

      {isAdmin && student.status === "ACTIVE" ? (
        <section className="space-y-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
            Ubah profil
          </h2>
          <EditStudentProfileForm
            student={{
              id: student.id,
              displayName: student.displayName,
              fullName: student.fullName,
              dateOfBirth: student.dateOfBirth,
              homeAddress: student.homeAddress,
              rt: student.rt,
              rw: student.rw,
              phone: student.phone,
              emergencyContactName: student.emergencyContactName,
              emergencyContactPhone: student.emergencyContactPhone,
              homeLanguage: student.homeLanguage,
              preferQuiet: student.preferQuiet,
              preferDimLight: student.preferDimLight,
              sensoryNotes: student.sensoryNotes,
              requirePhotoForSession: student.requirePhotoForSession,
              allergies: student.allergies ?? "",
              adminNotes: student.adminNotes ?? "",
            }}
          />
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="cerita-media-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="cerita-media-heading"
              className="text-lg font-semibold text-[var(--text,#1f2933)]"
            >
              Cerita & Personalisasi Media Murid
            </h2>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Cerita sosial yang memiliki foto personalisasi {student.displayName} (CERMIN: CERita MIRip Aku).
            </p>
          </div>
          <Link
            href="/dashboard/cerita"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 py-2 text-sm font-medium text-[var(--text,#1f2933)] hover:bg-[var(--bg,#f7f4ef)]"
          >
            Katalog Cerita
          </Link>
        </div>

        {personalizedStories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-white p-6 text-center">
            <p className="text-sm font-medium text-[var(--text,#1f2933)]">
              Belum ada foto personalisasi di cerita sosial
            </p>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Unggah foto {student.displayName} pada halaman cerita di menu Cerita agar foto dirinya muncul saat sesi belajar.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {personalizedStories.map((story) => (
              <li
                key={story.id}
                className="cermin-hover-card flex flex-col justify-between rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--cermin-muted,#5c6b73)]">
                      {story.categoryName}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[var(--cermin-accent-soft,#e6f2ee)] px-2.5 py-0.5 text-xs font-semibold text-[var(--cermin-accent,#3d7c6b)]">
                      {story.mediaCount} foto murid
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-[var(--text,#1f2933)]">
                    {story.title}
                  </h3>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cermin-border,#d9e2ec)] pt-3">
                  <Link
                    href={`/dashboard/cerita/${story.id}`}
                    className="inline-flex min-h-10 items-center text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] hover:underline"
                  >
                    Detail cerita →
                  </Link>
                  <Link
                    href={`/dashboard/sesi?tab=riwayat&studentId=${student.id}`}
                    className="inline-flex min-h-10 items-center text-xs font-medium text-[var(--text,#1f2933)] hover:underline"
                  >
                    Mulai sesi belajar →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Riwayat penugasan terapis
        </h2>
        {isAdmin ? (
          <div className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 sm:p-5">
            <p className="mb-3 text-sm font-medium text-[var(--text,#1f2933)]">
              Tugaskan terapis
            </p>
            <AssignTherapistForm studentId={student.id} therapists={therapists} />
          </div>
        ) : null}
        <ul className="grid gap-3 lg:hidden">
          {student.therapistAssignments.map((a) => (
            <li
              key={a.id}
              className="cermin-hover-card rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4"
            >
              <p className="font-semibold text-[var(--text,#1f2933)]">
                {a.therapist.name}
              </p>
              <p className="mt-1 break-all text-xs text-[var(--cermin-muted,#5c6b73)]">
                {a.therapist.email}
              </p>
              <p className="mt-2 text-xs text-[var(--cermin-muted,#5c6b73)]">
                {a.endedAt ? "Selesai" : "Aktif"}
                {" · "}
                {formatDateTime(a.startedAt)}
                {a.endedAt ? ` → ${formatDateTime(a.endedAt)}` : ""}
              </p>
              {isAdmin && !a.endedAt ? (
                <div className="mt-3">
                  <EndAssignmentButton assignmentId={a.id} />
                </div>
              ) : null}
            </li>
          ))}
          {student.therapistAssignments.length === 0 ? (
            <li className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 py-6 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
              Belum ada penugasan terapis.
            </li>
          ) : null}
        </ul>

        <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
              <tr>
                <th className="px-4 py-3 font-medium">Terapis</th>
                <th className="px-4 py-3 font-medium">Mulai</th>
                <th className="px-4 py-3 font-medium">Selesai</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin ? (
                  <th className="px-4 py-3 font-medium">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {student.therapistAssignments.map((a) => (
                <tr
                  key={a.id}
                  className="cermin-hover-row border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text,#1f2933)]">
                      {a.therapist.name}
                    </div>
                    <div className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      {a.therapist.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                    {formatDateTime(a.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                    {a.endedAt ? formatDateTime(a.endedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.endedAt ? "Selesai" : "Aktif"}
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {!a.endedAt ? (
                        <EndAssignmentButton assignmentId={a.id} />
                      ) : (
                        <span className="text-[var(--cermin-muted,#5c6b73)]">
                          —
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {student.therapistAssignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="px-4 py-6 text-center text-[var(--cermin-muted,#5c6b73)]"
                  >
                    Belum ada penugasan terapis.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Orang tua tertaut
        </h2>
        {isAdmin ? (
          <div className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 sm:p-5">
            <p className="mb-3 text-sm font-medium text-[var(--text,#1f2933)]">
              Tautkan orang tua
            </p>
            <LinkParentForm studentId={student.id} parents={parents} />
          </div>
        ) : null}
        <ul className="grid gap-3 lg:hidden">
          {[...activeLinks, ...inactiveLinks].map((link) => (
            <li
              key={link.id}
              className="cermin-hover-card rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4"
            >
              <p className="font-semibold text-[var(--text,#1f2933)]">
                {link.parent.name}
              </p>
              <p className="mt-1 break-all text-xs text-[var(--cermin-muted,#5c6b73)]">
                {link.parent.email}
              </p>
              <p className="mt-2 text-xs text-[var(--cermin-muted,#5c6b73)]">
                {link.relationLabel || "Hubungan tidak diisi"}
                {" · "}
                {link.isActive ? "Aktif" : "Nonaktif"}
              </p>
              {isAdmin && link.isActive ? (
                <div className="mt-3">
                  <UnlinkParentButton linkId={link.id} />
                </div>
              ) : null}
            </li>
          ))}
          {student.parentLinks.length === 0 ? (
            <li className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 py-6 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
              Belum ada orang tua tertaut.
            </li>
          ) : null}
        </ul>

        <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Hubungan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin ? (
                  <th className="px-4 py-3 font-medium">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {[...activeLinks, ...inactiveLinks].map((link) => (
                <tr
                  key={link.id}
                  className="cermin-hover-row border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text,#1f2933)]">
                      {link.parent.name}
                    </div>
                    <div className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      {link.parent.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                    {link.relationLabel || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {link.isActive ? "Aktif" : "Nonaktif"}
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {link.isActive ? (
                        <UnlinkParentButton linkId={link.id} />
                      ) : (
                        <span className="text-[var(--cermin-muted,#5c6b73)]">
                          —
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {student.parentLinks.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-6 text-center text-[var(--cermin-muted,#5c6b73)]"
                  >
                    Belum ada orang tua tertaut.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default async function MuridDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <MuridDetailLoader params={params} />
  );
}

async function MuridDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MuridDetailContent id={id} />;
}
