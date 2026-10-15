import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StoryStatus } from "@prisma/client";
import {
  AuthzError,
  requireSession,
  type PolicyUser,
} from "@/server/policies/access";
import {
  canUserTransitionStoryStatus,
  getStoryDetail,
  listActiveCategories,
} from "@/server/actions/stories";
import {
  STORY_STATUSES,
  type StoryStatusValue,
} from "@/server/validations/story";
import { PagesEditor } from "./pages-editor";
import { StatusActions } from "./status-actions";
import { StoryMetaForm } from "./story-meta-form";

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

export default async function CeritaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();

  let story;
  try {
    story = await getStoryDetail(id);
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 404) notFound();
      redirect("/dashboard/cerita");
    }
    throw error;
  }

  const editable = canEditContent(user, story);
  const targets = allowedTargets(user, story.status);
  const categories =
    user.role === "ADMIN" || user.role === "TERAPIS"
      ? await listActiveCategories()
      : [{ id: story.categoryId, name: story.category.name }];

  const pagesKey = story.pages
    .map((p) => `${p.id}:${p.sortOrder}:${p.bodyText.length}`)
    .join("|");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-10">
      <div>
        <Link
          href="/dashboard/cerita"
          className="text-sm text-[var(--accent,#3d7c6b)] hover:underline"
        >
          ← Kembali ke daftar cerita
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
              CERMIN
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
              {story.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted,#5c6b73)]">
              {story.category.name} · Status:{" "}
              {STATUS_LABEL[story.status] ?? story.status} · Pembuat:{" "}
              {story.createdBy.name}
            </p>
          </div>
          <StatusActions storyId={story.id} targets={targets} />
        </div>
      </div>

      <StoryMetaForm
        key={`meta-${story.updatedAt.toISOString()}`}
        storyId={story.id}
        initial={{
          categoryId: story.categoryId,
          title: story.title,
          description: story.description,
          learningObjectives: story.learningObjectives,
        }}
        categories={categories}
        readOnly={!editable}
      />

      <PagesEditor
        key={`pages-${pagesKey}`}
        storyId={story.id}
        pages={story.pages.map((p) => ({
          id: p.id,
          sortOrder: p.sortOrder,
          bodyText: p.bodyText,
        }))}
        readOnly={!editable}
      />
    </main>
  );
}
