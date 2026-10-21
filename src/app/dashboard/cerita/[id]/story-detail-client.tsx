"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { StoryStatusValue } from "@/server/validations/story";
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
import { StoryCoverUploader } from "./story-cover-uploader";
import { StoryMetaForm } from "./story-meta-form";
import { StoryPreviewPanel } from "./story-preview-panel";
import { StoryVersionsPanel } from "./story-versions-panel";
import type { PageMediaItem, StudentOption } from "./page-media-uploader";
import type { PageMcqSeed } from "./page-mcq-editor";
import type { ListedStoryVersion } from "@/server/actions/stories";

type PageItem = {
  id: string;
  sortOrder: number;
  title: string;
  bodyText: string;
  media: PageMediaItem[];
  mcq: PageMcqSeed;
};

type PreviewPage = {
  id: string;
  sortOrder: number;
  bodyText: string;
  media: Array<{
    id: string;
    kind: string;
    altText: string | null;
    sortOrder: number;
    studentId: string | null;
  }>;
};

type CategoryOption = { id: string; name: string };

export type StoryDetailClientProps = {
  storyId: string;
  title: string;
  categoryName: string;
  createdByName: string;
  statusLabel: string;
  status: StoryStatusValue;
  editable: boolean;
  steps: AuthoringStepMeta[];
  initialTab: AuthoringStepId;
  targets: StoryStatusValue[];
  meta: {
    categoryId: string;
    title: string;
    description: string;
    learningObjectives: string;
    updatedAtIso: string;
    coverMediaId: string | null;
  };
  categories: CategoryOption[];
  students: StudentOption[];
  pages: PageItem[];
  previewPages: PreviewPage[];
  versions: ListedStoryVersion[];
  canRestoreVersion: boolean;
  archivedReason?: string | null;
};

function tabUrl(storyId: string, tab: AuthoringStepId) {
  return `/dashboard/cerita/${storyId}?tab=${tab}`;
}

export function StoryDetailClient({
  storyId,
  title,
  categoryName,
  createdByName,
  statusLabel,
  status,
  editable,
  steps,
  initialTab,
  targets,
  meta,
  categories,
  students,
  pages,
  previewPages,
  versions,
  canRestoreVersion,
  archivedReason = null,
}: StoryDetailClientProps) {
  const [active, setActive] = useState<AuthoringStepId>(initialTab);
  const [visited, setVisited] = useState<Set<AuthoringStepId>>(
    () => new Set([initialTab]),
  );
  const [, startTransition] = useTransition();

  const selectTab = useCallback(
    (tab: AuthoringStepId) => {
      if (tab === active) return;
      startTransition(() => {
        setActive(tab);
        setVisited((prev) => {
          if (prev.has(tab)) return prev;
          const next = new Set(prev);
          next.add(tab);
          return next;
        });
      });
      // Jangan router.replace — itu memicu RSC refetch penuh.
      window.history.pushState(null, "", tabUrl(storyId, tab));
    },
    [active, storyId],
  );

  useEffect(() => {
    function onPopState() {
      const raw = new URL(window.location.href).searchParams.get("tab");
      const parsed = parseAuthoringTab(raw) ?? initialTab;
      setActive(parsed);
      setVisited((prev) => {
        if (prev.has(parsed)) return prev;
        const next = new Set(prev);
        next.add(parsed);
        return next;
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialTab]);

  const show = (id: AuthoringStepId) => visited.has(id);

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      <div>
        <a
          href="/dashboard/cerita"
          className="text-sm text-[var(--cermin-accent,#3d7c6b)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
        >
          ← Kembali ke daftar cerita
        </a>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[var(--text,#1f2933)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
              {categoryName} · {statusLabel} · Pembuat: {createdByName}
            </p>
          </div>
        </div>
      </div>

      <StoryAuthoringWizard
        storyId={storyId}
        steps={steps}
        statusLabel={statusLabel}
        editable={editable}
        active={active}
        onTabChange={selectTab}
      >
        {show("identitas") ? (
          <div
            className={active === "identitas" ? "flex flex-col gap-4" : "hidden"}
            aria-hidden={active !== "identitas"}
          >
            <StoryMetaForm
              key={`meta-${meta.updatedAtIso}`}
              storyId={storyId}
              initial={{
                categoryId: meta.categoryId,
                title: meta.title,
                description: meta.description,
                learningObjectives: meta.learningObjectives,
              }}
              categories={categories}
              readOnly={!editable}
            />
            <StoryCoverUploader
              key={`cover-${meta.coverMediaId ?? "none"}-${meta.updatedAtIso}`}
              storyId={storyId}
              coverMediaId={meta.coverMediaId}
              readOnly={!editable}
            />
          </div>
        ) : null}

        {show("halaman") ? (
          <div
            className={active === "halaman" ? undefined : "hidden"}
            aria-hidden={active !== "halaman"}
          >
            <PagesEditor
              storyId={storyId}
              students={students}
              pages={pages}
              readOnly={!editable}
            />
          </div>
        ) : null}

        {show("preview") ? (
          <div
            className={active === "preview" ? undefined : "hidden"}
            aria-hidden={active !== "preview"}
          >
            <StoryPreviewPanel
              title={title}
              students={students.map((s) => ({
                id: s.id,
                displayName: s.displayName,
              }))}
              pages={previewPages}
            />
          </div>
        ) : null}

        {show("status") ? (
          <div
            className={active === "status" ? undefined : "hidden"}
            aria-hidden={active !== "status"}
          >
            <StatusTimeline
              storyId={storyId}
              title={title}
              currentStatus={status}
              targets={targets}
              archivedReason={archivedReason}
            />
            <StoryVersionsPanel
              storyId={storyId}
              versions={versions}
              canRestore={canRestoreVersion}
            />
          </div>
        ) : null}
      </StoryAuthoringWizard>
    </main>
  );
}
