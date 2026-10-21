"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  CircleHelp,
  ImageIcon,
  Mic,
  Type,
  UserRound,
} from "lucide-react";
import {
  createStoryPage,
  deleteStoryPage,
  reorderStoryPages,
  updateStoryPage,
} from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  PageMediaUploader,
  type MediaFocusSection,
  type PageMediaItem,
  type PageMediaUploaderHandle,
  type StudentOption,
} from "./page-media-uploader";
import { PageMcqEditor, type PageMcqSeed } from "./page-mcq-editor";

type PageItem = {
  id: string;
  sortOrder: number;
  title: string;
  bodyText: string;
  media: PageMediaItem[];
  mcq: PageMcqSeed;
};

type PageDraft = { title: string; bodyText: string };

type PageTab = "teks" | "foto" | "ilustrasi" | "tambahan" | "soal";

type EditorCache = {
  pages: PageItem[];
  drafts: Record<string, PageDraft>;
  openIds: string[];
  pageTabs: Record<string, PageTab>;
};

/**
 * Soft-refresh RSC setelah Server Action sering me-remount child client.
 * Cache modul menjaga list + draft antar remount (satu tab browser).
 */
const editorCache = new Map<string, EditorCache>();

const PAGE_TABS: Array<{
  value: PageTab;
  label: string;
  short: string;
  icon: typeof Type;
  mediaFocus?: MediaFocusSection;
}> = [
  { value: "teks", label: "Judul & Deskripsi", short: "Teks", icon: Type },
  {
    value: "foto",
    label: "Foto Murid",
    short: "Foto",
    icon: UserRound,
    mediaFocus: "portrait",
  },
  {
    value: "ilustrasi",
    label: "Ilustrasi",
    short: "Ilustrasi",
    icon: ImageIcon,
    mediaFocus: "illustration",
  },
  {
    value: "tambahan",
    label: "Audio & Tambahan",
    short: "Audio",
    icon: Mic,
    mediaFocus: "extra",
  },
  {
    value: "soal",
    label: "Soal",
    short: "Soal",
    icon: CircleHelp,
  },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function draftsFromPages(pages: PageItem[]): Record<string, PageDraft> {
  return Object.fromEntries(
    pages.map((p) => [p.id, { title: p.title, bodyText: p.bodyText }]),
  );
}

function normalizeDraft(
  value: PageDraft | string | undefined,
  fallback: PageDraft,
): PageDraft {
  if (value && typeof value === "object" && "bodyText" in value) {
    return {
      title: value.title ?? "",
      bodyText: value.bodyText ?? "",
    };
  }
  if (typeof value === "string") {
    return { title: fallback.title ?? "", bodyText: value };
  }
  return { title: fallback.title ?? "", bodyText: fallback.bodyText ?? "" };
}

/** Gabung media lokal + server by id (lokal menang jika id sama). */
function mergeMedia(
  local: PageMediaItem[],
  server: PageMediaItem[],
): PageMediaItem[] {
  const byId = new Map<string, PageMediaItem>();
  for (const m of server) byId.set(m.id, m);
  for (const m of local) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Gabung server + lokal: jangan buang item lokal; hormati hapus yang sudah di server. */
function mergePages(
  local: PageItem[],
  server: PageItem[],
  knownServerIds: Set<string>,
): PageItem[] {
  const byId = new Map<string, PageItem>();

  for (const p of local) {
    byId.set(p.id, p);
  }

  for (const sp of server) {
    const existing = byId.get(sp.id);
    if (!existing) {
      byId.set(sp.id, sp);
      continue;
    }
    byId.set(sp.id, {
      ...sp,
      title: existing.title,
      bodyText: existing.bodyText,
      media: mergeMedia(existing.media, sp.media),
      mcq: existing.mcq ?? sp.mcq,
    });
  }

  for (const id of [...byId.keys()]) {
    if (knownServerIds.has(id) && !server.some((p) => p.id === id)) {
      byId.delete(id);
    }
  }

  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function hydrateFromCache(
  storyId: string,
  initialPages: PageItem[],
): EditorCache {
  const cached = editorCache.get(storyId);
  if (!cached) {
    return {
      pages: initialPages,
      drafts: draftsFromPages(initialPages),
      openIds: initialPages[0] ? [initialPages[0].id] : [],
      pageTabs: {},
    };
  }

  const knownServerIds = new Set(cached.pages.map((p) => p.id));
  const pages = mergePages(cached.pages, initialPages, knownServerIds);
  const drafts: Record<string, PageDraft> = {};
  for (const p of pages) {
    drafts[p.id] = normalizeDraft(cached.drafts[p.id], p);
  }
  const pageIds = new Set(pages.map((p) => p.id));
  const openIds = cached.openIds.filter((id) => pageIds.has(id));
  if (openIds.length === 0 && pages[0]) openIds.push(pages[0].id);
  const pageTabs: Record<string, PageTab> = {};
  for (const [id, tab] of Object.entries(cached.pageTabs ?? {})) {
    if (pageIds.has(id)) pageTabs[id] = tab;
  }

  return { pages, drafts, openIds, pageTabs };
}

function pagesSignature(pages: PageItem[]): string {
  return pages
    .map((p) => `${p.id}:${p.media.map((m) => m.id).join(",")}`)
    .join("|");
}

function isPageTab(value: string): value is PageTab {
  return (
    value === "teks" ||
    value === "foto" ||
    value === "ilustrasi" ||
    value === "tambahan" ||
    value === "soal"
  );
}

export function PagesEditor({
  storyId,
  pages: initialPages,
  students,
  readOnly,
}: {
  storyId: string;
  pages: PageItem[];
  students: StudentOption[];
  readOnly: boolean;
}) {
  const mediaRefs = useRef<Record<string, PageMediaUploaderHandle | null>>({});
  const knownServerIdsRef = useRef<Set<string>>(
    new Set(initialPages.map((p) => p.id)),
  );
  const restoredRef = useRef(false);
  const serverSigRef = useRef(pagesSignature(initialPages));

  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [drafts, setDrafts] = useState<Record<string, PageDraft>>(() =>
    draftsFromPages(initialPages),
  );
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialPages[0] ? [initialPages[0].id] : []),
  );
  const [pageTabs, setPageTabs] = useState<Record<string, PageTab>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pagesBeforeReorder = useRef<PageItem[] | null>(null);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const boot = hydrateFromCache(storyId, initialPages);
    knownServerIdsRef.current = new Set([
      ...knownServerIdsRef.current,
      ...boot.pages.map((p) => p.id),
      ...initialPages.map((p) => p.id),
    ]);
    setPages(boot.pages);
    setDrafts(boot.drafts);
    setOpenIds(new Set(boot.openIds));
    setPageTabs(boot.pageTabs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali setelah mount
  }, [storyId]);

  useEffect(() => {
    if (!restoredRef.current) return;
    editorCache.set(storyId, {
      pages,
      drafts,
      openIds: [...openIds],
      pageTabs,
    });
  }, [storyId, pages, drafts, openIds, pageTabs]);

  useEffect(() => {
    const sig = pagesSignature(initialPages);
    if (sig === serverSigRef.current && restoredRef.current) {
      return;
    }
    serverSigRef.current = sig;
    setPages((local) => {
      const merged = mergePages(
        local,
        initialPages,
        knownServerIdsRef.current,
      );
      knownServerIdsRef.current = new Set([
        ...knownServerIdsRef.current,
        ...initialPages.map((p) => p.id),
      ]);
      return merged;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of initialPages) {
        if (!(p.id in next)) {
          next[p.id] = { title: p.title, bodyText: p.bodyText };
        }
      }
      return next;
    });
  }, [initialPages]);

  function toggleOpen(pageId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }

  function setPageMedia(pageId: string, media: PageMediaItem[]) {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, media } : p)),
    );
  }

  function getTab(pageId: string): PageTab {
    return pageTabs[pageId] ?? "teks";
  }

  function setTab(pageId: string, tab: PageTab) {
    setPageTabs((prev) => ({ ...prev, [pageId]: tab }));
  }

  function updateDraft(
    pageId: string,
    patch: Partial<PageDraft>,
  ) {
    setDrafts((prev) => {
      const current = prev[pageId] ?? { title: "", bodyText: "" };
      return {
        ...prev,
        [pageId]: { ...current, ...patch },
      };
    });
  }

  function onAddPage() {
    setError(null);
    startTransition(async () => {
      const result = await createStoryPage({ storyId, bodyText: "" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const newId = result.data.id;
      knownServerIdsRef.current.add(newId);
      setPages((prev) => {
        if (prev.some((p) => p.id === newId)) return prev;
        return [
          ...prev,
          {
            id: newId,
            sortOrder: prev.length,
            title: "",
            bodyText: "",
            media: [] as PageMediaItem[],
            mcq: null,
          },
        ];
      });
      setDrafts((prev) => ({
        ...prev,
        [newId]: prev[newId] ?? { title: "", bodyText: "" },
      }));
      setPageTabs((prev) => ({ ...prev, [newId]: "teks" }));
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.add(newId);
        return next;
      });
    });
  }

  function onSavePage(pageId: string) {
    setError(null);
    startTransition(async () => {
      const draft = drafts[pageId] ?? { title: "", bodyText: "" };

      // Unggah dulu (file di state React) sebelum update teks —
      // server action teks tidak boleh mendahului agar file pending tidak hilang.
      const uploadResult = await mediaRefs.current[pageId]?.uploadPending();
      if (uploadResult?.error) {
        setError(uploadResult.error);
        return;
      }

      const result = await updateStoryPage({
        pageId,
        title: draft.title,
        bodyText: draft.bodyText,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                title: draft.title,
                bodyText: draft.bodyText,
                media: uploadResult?.media ?? p.media,
              }
            : p,
        ),
      );
    });
  }

  function onDeletePage(pageId: string) {
    if (!window.confirm("Hapus halaman ini?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteStoryPage(pageId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      knownServerIdsRef.current.delete(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[pageId];
        return next;
      });
      setPageTabs((prev) => {
        const next = { ...prev };
        delete next[pageId];
        return next;
      });
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    });
  }

  function movePage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;
    const reordered = [...pages];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item!);
    const withOrder = reordered.map((p, i) => ({ ...p, sortOrder: i }));
    pagesBeforeReorder.current = pages;
    setPages(withOrder);
    setError(null);
    startTransition(async () => {
      const result = await reorderStoryPages({
        storyId,
        pageIds: withOrder.map((p) => p.id),
      });
      if (!result.ok) {
        setError(result.error);
        if (pagesBeforeReorder.current) {
          setPages(pagesBeforeReorder.current);
        }
      }
      pagesBeforeReorder.current = null;
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
            Halaman cerita
          </h2>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Per halaman: teks, foto murid, ilustrasi, audio, dan opsional soal
            (jumlah opsi bebas). Satu tombol Simpan mengunggah media yang sudah dipilih.
          </p>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            className="min-h-11 w-full shrink-0 sm:w-auto"
            onClick={onAddPage}
            disabled={pending}
          >
            Tambah halaman
          </Button>
        ) : null}
      </div>

      {pages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--text,#1f2933)]">
            Belum ada halaman
          </p>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Mulai dengan satu halaman pendek — Anda bisa menambah dan mengurutkan
            nanti.
          </p>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {pages.map((page, index) => {
          const isOpen = openIds.has(page.id);
          const panelId = `page-panel-${page.id}`;
          const headerId = `page-header-${page.id}`;
          const draft = normalizeDraft(drafts[page.id], {
            title: page.title ?? "",
            bodyText: page.bodyText ?? "",
          });
          const activeTab = getTab(page.id);
          const mediaFocus: MediaFocusSection =
            activeTab === "foto"
              ? "portrait"
              : activeTab === "ilustrasi"
                ? "illustration"
                : "extra";
          const previewTitle = draft.title.trim();
          const previewBody = draft.bodyText.trim();
          const preview =
            previewTitle ||
            (previewBody.length > 0
              ? previewBody.slice(0, 80) +
                (previewBody.length > 80 ? "…" : "")
              : "Belum ada teks");

          return (
            <li
              key={page.id}
              className="cermin-hover-card overflow-hidden rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]"
            >
              <div className="flex flex-wrap items-stretch gap-2 p-2 sm:p-3">
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleOpen(page.id)}
                  className={cx(
                    "cermin-hover-row flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
                  )}
                >
                  <ChevronDown
                    className={cx(
                      "size-4 shrink-0 text-[var(--cermin-muted,#5c6b73)] transition-transform duration-200 motion-reduce:transition-none",
                      !isOpen && "-rotate-90",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--text,#1f2933)]">
                      Halaman {index + 1}
                      {previewTitle ? (
                        <span className="font-normal text-[var(--cermin-muted,#5c6b73)]">
                          {" "}
                          · {previewTitle}
                        </span>
                      ) : null}
                    </span>
                    {!isOpen ? (
                      <span className="mt-0.5 block truncate text-xs text-[var(--cermin-muted,#5c6b73)]">
                        {previewTitle ? previewBody.slice(0, 60) || "Tanpa deskripsi" : preview}
                        {" · "}
                        {page.media.length} media
                      </span>
                    ) : null}
                  </span>
                </button>

                {!readOnly ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 min-w-11"
                      disabled={pending || index === 0}
                      onClick={() => movePage(index, -1)}
                    >
                      Naik
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 min-w-11"
                      disabled={pending || index === pages.length - 1}
                      onClick={() => movePage(index, 1)}
                    >
                      Turun
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      disabled={pending}
                      onClick={() => onDeletePage(page.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                ) : null}
              </div>

              {isOpen ? (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className="border-t border-[var(--border,#d9e2ec)] bg-white p-3 sm:p-4"
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={(next) => {
                      if (next == null) return;
                      const value = String(next);
                      if (isPageTab(value)) setTab(page.id, value);
                    }}
                    className="w-full gap-4"
                  >
                    <TabsList
                      variant="line"
                      aria-label={`Bagian halaman ${index + 1}`}
                      className="h-auto min-h-11 w-full flex-wrap justify-start gap-0 rounded-none border-b border-[var(--border,#d9e2ec)] bg-transparent p-0"
                    >
                      {PAGE_TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="min-h-11 shrink-0 gap-1.5 rounded-none px-2.5 py-2 text-xs sm:px-3 sm:text-sm data-active:text-[var(--focus,#0b6e4f)] after:bg-[var(--cermin-accent,#3d7c6b)] group-data-horizontal/tabs:after:bottom-0"
                          >
                            <Icon data-icon="inline-start" aria-hidden />
                            <span className="sm:hidden">{tab.short}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    <TabsContent
                      value="teks"
                      className="mt-1 flex flex-col gap-4 outline-none"
                    >
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`page-title-${page.id}`}>Judul</Label>
                        <Input
                          id={`page-title-${page.id}`}
                          value={draft.title}
                          onChange={(e) =>
                            updateDraft(page.id, { title: e.target.value })
                          }
                          disabled={pending || readOnly}
                          readOnly={readOnly}
                          placeholder="Judul singkat halaman (opsional)"
                          maxLength={200}
                          className="min-h-11"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`page-body-${page.id}`}>
                          Deskripsi
                        </Label>
                        <Textarea
                          id={`page-body-${page.id}`}
                          rows={5}
                          value={draft.bodyText}
                          onChange={(e) =>
                            updateDraft(page.id, {
                              bodyText: e.target.value,
                            })
                          }
                          disabled={pending || readOnly}
                          readOnly={readOnly}
                          placeholder="Teks cerita yang dibaca bersama anak"
                        />
                        <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                          Teks ini tampil di sisi kanan child mode.
                        </p>
                      </div>
                    </TabsContent>

                    {/* Panel kosong agar tab media tetap valid; uploader di luar agar tidak unmount */}
                    <TabsContent value="foto" className="sr-only" />
                    <TabsContent value="ilustrasi" className="sr-only" />
                    <TabsContent value="tambahan" className="sr-only" />

                    <TabsContent
                      value="soal"
                      className="mt-1 outline-none"
                    >
                      <PageMcqEditor
                        pageId={page.id}
                        seed={page.mcq}
                        readOnly={readOnly}
                        onChanged={(mcq) =>
                          setPages((prev) =>
                            prev.map((p) =>
                              p.id === page.id ? { ...p, mcq } : p,
                            ),
                          )
                        }
                      />
                    </TabsContent>
                  </Tabs>

                  <div
                    className={cx(
                      "mt-4",
                      (activeTab === "teks" || activeTab === "soal") && "hidden",
                    )}
                    aria-hidden={activeTab === "teks" || activeTab === "soal"}
                  >
                    <PageMediaUploader
                      ref={(handle) => {
                        mediaRefs.current[page.id] = handle;
                      }}
                      storyId={storyId}
                      pageId={page.id}
                      media={page.media}
                      students={students}
                      readOnly={readOnly}
                      focusSection={mediaFocus}
                      onMediaChange={(media) => setPageMedia(page.id, media)}
                    />
                  </div>

                  {!readOnly ? (
                    <div className="mt-4 flex w-full flex-col gap-2 border-t border-[var(--border,#d9e2ec)] pt-4 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        className="min-h-11 w-full sm:w-auto"
                        disabled={pending}
                        onClick={() => onSavePage(page.id)}
                      >
                        {pending ? "Menyimpan…" : "Simpan halaman"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
