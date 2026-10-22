import { notFound, redirect } from "next/navigation";
import { StoryStatus } from "@prisma/client";
import {
  AuthzError,
  canUserTransitionStoryStatus,
  requireSession,
  type PolicyUser,
} from "@/server/policies/access";

/** Auth + Prisma — blocking route. */
export const instant = false;
import {
  getStoryDetail,
  getStoryEditorShell,
  listActiveCategories,
  listStoryVersions,
} from "@/server/actions/stories";
import { listActiveStudentsForSession } from "@/server/actions/students";
import {
  STORY_STATUSES,
  type StoryStatusValue,
} from "@/server/validations/story";
import {
  parseAuthoringTab,
  type AuthoringStepId,
} from "./authoring-tab";
import type { AuthoringStepMeta } from "./story-authoring-wizard";
import { StoryDetailClient } from "./story-detail-client";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

function allowedTargets(
  user: PolicyUser,
  from: StoryStatus,
): StoryStatusValue[] {
  return STORY_STATUSES.filter((to) =>
    canUserTransitionStoryStatus(user, from, to as StoryStatus),
  );
}

function canEditContent(
  user: PolicyUser,
  story: { status: StoryStatus; createdById: string },
): boolean {
  if (user.role === "ADMIN") return story.status !== StoryStatus.ARCHIVED;
  if (user.role === "TERAPIS") {
    return (
      story.status === StoryStatus.DRAFT && story.createdById === user.id
    );
  }
  return false;
}

function resolveActiveTab(
  initialTab: string | null,
  steps: AuthoringStepMeta[],
): AuthoringStepId {
  const parsed = parseAuthoringTab(initialTab);
  if (parsed && steps.some((s) => s.id === parsed)) return parsed;
  return steps.find((s) => !s.done)?.id ?? steps[0]?.id ?? "identitas";
}

async function CeritaDetailContent({
  id,
  initialTab,
}: {
  id: string;
  initialTab: string | null;
}) {
  const user = await requireSession();
  const canManage = user.role === "ADMIN" || user.role === "TERAPIS";

  let shell: Awaited<ReturnType<typeof getStoryEditorShell>>;
  let categories: Awaited<ReturnType<typeof listActiveCategories>> = [];
  let students: Awaited<ReturnType<typeof listActiveStudentsForSession>> = [];
  let detail: Awaited<ReturnType<typeof getStoryDetail>> | null = null;
  let versions: Awaited<ReturnType<typeof listStoryVersions>> = [];

  try {
    const [
      shellResult,
      categoryResult,
      studentResult,
      detailResult,
      versionResult,
    ] = await Promise.all([
      getStoryEditorShell(id),
      canManage ? listActiveCategories() : Promise.resolve(null),
      canManage ? listActiveStudentsForSession() : Promise.resolve(null),
      getStoryDetail(id),
      canManage ? listStoryVersions(id) : Promise.resolve([]),
    ]);
    shell = shellResult;
    categories =
      categoryResult ?? [{ id: shell.categoryId, name: shell.category.name }];
    if (studentResult) students = studentResult;
    detail = detailResult;
    versions = versionResult;
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 404) notFound();
      redirect("/dashboard/cerita");
    }
    throw error;
  }

  if (!detail) {
    notFound();
  }

  const editable = canEditContent(user, shell);
  const targets = allowedTargets(user, shell.status);
  const statusLabel = STATUS_LABEL[shell.status] ?? shell.status;

  const identitasDone =
    shell.title.trim().length > 0 && Boolean(shell.categoryId);
  const halamanDone =
    shell.pageCount > 0 &&
    shell.pagesWithText === shell.pageCount &&
    shell.pagesWithMedia > 0;
  const previewDone = shell.pageCount > 0;
  const statusDone =
    shell.status === StoryStatus.PUBLISHED ||
    shell.status === StoryStatus.APPROVED;

  const steps: AuthoringStepMeta[] = [
    {
      id: "identitas",
      title: "Identitas cerita",
      short: "Identitas",
      tip: "Tulis judul yang jelas untuk anak dan orang dewasa, pilih kategori aktif, lalu jelaskan deskripsi singkat serta tujuan belajar. Metadata ini muncul di daftar cerita dan membantu terapis lain memahami konteks.",
      done: identitasDone,
    },
    {
      id: "halaman",
      title: "Halaman, teks, media, dan soal",
      short: "Halaman",
      tip: `Susun alur cerita halaman demi halaman. Teks singkat dan tenang. Unggah gambar/audio, lalu opsional tambah satu soal per halaman (jumlah pilihan bebas, teks/gambar). Saat ini: ${shell.pageCount} halaman · ${shell.pagesWithText} berteks · ${shell.pagesWithMedia} bermedia.`,
      done: halamanDone,
    },
    {
      id: "preview",
      title: "Pratinjau mode belajar",
      short: "Preview",
      tip: "Pratinjau tampilan seperti /belajar: foto murid, teks besar, ilustrasi umum, dan audio — tanpa menyimpan sesi.",
      done: previewDone,
    },
    {
      id: "status",
      title: "Status dan penerbitan",
      short: "Status",
      tip: "Ajukan review, setujui, atau publikasikan sesuai peran Anda. Hanya cerita Terbit yang bisa dipilih untuk sesi child mode. Arsipkan jika cerita tidak lagi dipakai.",
      done: statusDone,
    },
  ];

  const active = resolveActiveTab(initialTab, steps);

  const pages = detail.pages.map((p) => ({
    id: p.id,
    sortOrder: p.sortOrder,
    title: p.title,
    bodyText: p.bodyText,
    media: p.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      mimeType: m.mimeType,
      altText: m.altText,
      sortOrder: m.sortOrder,
      studentId: m.studentId,
      student: m.student,
    })),
    mcq: p.mcq
      ? {
          id: p.mcq.id,
          prompt: p.mcq.prompt,
          promptImageKey: p.mcq.promptImageKey,
          correctKey: p.mcq.correctKey,
          choices: p.mcq.choices.map((c) => ({
            id: c.id,
            key: c.key,
            labelText: c.labelText,
            imageKey: c.imageKey,
          })),
        }
      : null,
  }));

  const previewPages = detail.pages.map((p) => ({
    id: p.id,
    sortOrder: p.sortOrder,
    bodyText: p.bodyText,
    media: p.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      altText: m.altText,
      sortOrder: m.sortOrder,
      studentId: m.studentId,
    })),
  }));

  return (
    <StoryDetailClient
      storyId={shell.id}
      title={shell.title}
      categoryName={shell.category.name}
      createdByName={shell.createdBy.name}
      statusLabel={statusLabel}
      status={shell.status as StoryStatusValue}
      editable={editable}
      steps={steps}
      initialTab={active}
      targets={targets}
      meta={{
        categoryId: shell.categoryId,
        title: shell.title,
        description: shell.description,
        learningObjectives: shell.learningObjectives,
        updatedAtIso: shell.updatedAt.toISOString(),
        coverMediaId: shell.coverMediaId,
      }}
      categories={categories}
      students={students}
      pages={pages}
      previewPages={previewPages}
      versions={versions}
      canRestoreVersion={
        user.role === "ADMIN" ||
        (user.role === "TERAPIS" &&
          shell.status === StoryStatus.DRAFT &&
          shell.createdById === user.id)
      }
      archivedReason={shell.archivedReason}
    />
  );
}

export default async function CeritaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const raw = sp.tab;
  const initialTab =
    typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? null) : null;
  return <CeritaDetailContent id={id} initialTab={initialTab} />;
}
