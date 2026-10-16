import type { ReactNode } from "react";
import Link from "next/link";
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
import { countStoryEvaluations } from "@/server/actions/evaluations";
import {
  getStoryDetail,
  getStoryEditorShell,
  listActiveCategories,
} from "@/server/actions/stories";
import { listActiveStudentsForSession } from "@/server/actions/students";
import {
  STORY_STATUSES,
  type StoryStatusValue,
} from "@/server/validations/story";
import { PagesEditor } from "./pages-editor";
import { StatusTimeline } from "./status-timeline";
import {
  parseAuthoringTab,
  type AuthoringStepId,
} from "./authoring-tab";
import {
  StoryAuthoringWizard,
  type AuthoringStepMeta,
} from "./story-authoring-wizard";
import { StoryEvaluationPanel } from "./story-evaluation-panel";
import { StoryCoverUploader } from "./story-cover-uploader";
import { StoryMetaForm } from "./story-meta-form";
import { StoryPreviewPanel } from "./story-preview-panel";

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
  let evaluationCount = 0;
  try {
    const [shellResult, evalCount] = await Promise.all([
      getStoryEditorShell(id),
      countStoryEvaluations(id),
    ]);
    shell = shellResult;
    evaluationCount = evalCount;
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 404) notFound();
      redirect("/dashboard/cerita");
    }
    throw error;
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
  const evaluasiDone = evaluationCount > 0;
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
      title: "Halaman, teks, dan media",
      short: "Halaman",
      tip: `Susun alur cerita halaman demi halaman. Teks singkat dan tenang. Unggah gambar umum atau foto khusus murid (personalization), plus audio narasi jika perlu. Saat ini: ${shell.pageCount} halaman · ${shell.pagesWithText} berteks · ${shell.pagesWithMedia} bermedia.`,
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
      id: "evaluasi",
      title: "Evaluasi sesi",
      short: "Evaluasi",
      tip: "Buat template pertanyaan yang diisi orang dewasa saat sesi /belajar. Bukan skor kompetitif — observasi singkat agar tindak lanjut terarah. Opsional tetapi sangat membantu laporan.",
      done: evaluasiDone,
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
  const needsPages = active === "halaman" || active === "preview";
  const needsCategories = active === "identitas" && canManage;
  const needsStudents = needsPages && canManage;

  let categories: Awaited<ReturnType<typeof listActiveCategories>> = [
    { id: shell.categoryId, name: shell.category.name },
  ];
  let students: Awaited<ReturnType<typeof listActiveStudentsForSession>> = [];
  let detail: Awaited<ReturnType<typeof getStoryDetail>> | null = null;

  try {
    const [categoryResult, studentResult, detailResult] = await Promise.all([
      needsCategories
        ? listActiveCategories()
        : Promise.resolve(null),
      needsStudents
        ? listActiveStudentsForSession()
        : Promise.resolve(null),
      needsPages ? getStoryDetail(id) : Promise.resolve(null),
    ]);
    if (categoryResult) categories = categoryResult;
    if (studentResult) students = studentResult;
    detail = detailResult;
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 404) notFound();
      redirect("/dashboard/cerita");
    }
    throw error;
  }

  let panel: ReactNode = null;
  if (active === "identitas") {
    panel = (
      <div className="flex flex-col gap-4">
        <StoryMetaForm
          key={`meta-${shell.updatedAt.toISOString()}`}
          storyId={shell.id}
          initial={{
            categoryId: shell.categoryId,
            title: shell.title,
            description: shell.description,
            learningObjectives: shell.learningObjectives,
          }}
          categories={categories}
          readOnly={!editable}
        />
        <StoryCoverUploader
          key={`cover-${shell.coverMediaId ?? "none"}-${shell.updatedAt.toISOString()}`}
          storyId={shell.id}
          coverMediaId={shell.coverMediaId}
          readOnly={!editable}
        />
      </div>
    );
  } else if (active === "halaman" && detail) {
    panel = (
      <PagesEditor
        key={shell.id}
        storyId={shell.id}
        students={students}
        pages={detail.pages.map((p) => ({
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
        }))}
        readOnly={!editable}
      />
    );
  } else if (active === "preview" && detail) {
    panel = (
      <StoryPreviewPanel
        title={shell.title}
        students={students.map((s) => ({
          id: s.id,
          displayName: s.displayName,
        }))}
        pages={detail.pages.map((p) => ({
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
        }))}
      />
    );
  } else if (active === "evaluasi") {
    panel = (
      <StoryEvaluationPanel
        storyId={shell.id}
        categoryName={shell.category.name}
        readOnly={!editable}
      />
    );
  } else if (active === "status") {
    panel = (
      <StatusTimeline
        storyId={shell.id}
        currentStatus={shell.status as StoryStatusValue}
        targets={targets}
      />
    );
  }

  return (
    <main className="w-full flex-1 flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div>
        <Link
          href="/dashboard/cerita"
          className="text-sm text-[var(--cermin-accent,#3d7c6b)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
        >
          ← Kembali ke daftar cerita
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[var(--text,#1f2933)] sm:text-3xl">
              {shell.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
              {shell.category.name} · {statusLabel} · Pembuat:{" "}
              {shell.createdBy.name}
            </p>
          </div>
        </div>
      </div>

      <StoryAuthoringWizard
        storyId={shell.id}
        steps={steps}
        statusLabel={statusLabel}
        editable={editable}
        active={active}
      >
        {panel}
      </StoryAuthoringWizard>
    </main>
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
