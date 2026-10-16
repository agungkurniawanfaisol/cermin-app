"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEvaluationItem,
  createStoryEvaluation,
  deleteEvaluationItem,
  deleteStoryEvaluation,
  listStoryEvaluations,
  saveStoryEvaluation,
  type StoryEvaluationWithItems,
} from "@/server/actions/evaluations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const RESEARCH_INDICATOR_PRESETS: Record<
  string,
  { title: string; items: string[] }
> = {
  Bergiliran: {
    title: "Indikator Perilaku Bergiliran",
    items: [
      "Menunggu giliran teman tanpa merebut alat permainan",
      "Memulai giliran sendiri ketika gilirannya tiba",
      "Menyerahkan alat atau giliran kepada teman setelah selesai",
    ],
  },
  "Menerima Kemenangan dan Kekalahan": {
    title: "Indikator Menerima Kemenangan dan Kekalahan",
    items: [
      "Tetap berada dalam permainan setelah kalah",
      "Tidak menyerang teman atau merusak permainan ketika kalah",
      "Menanggapi kemenangan teman tanpa mengganggu",
    ],
  },
};

export function StoryEvaluationPanel({
  storyId,
  categoryName,
  readOnly,
}: {
  storyId: string;
  categoryName?: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [evals, setEvals] = useState<StoryEvaluationWithItems[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      try {
        const rows = await listStoryEvaluations(storyId);
        setEvals(rows);
        setLoadError(null);
      } catch {
        setLoadError("Gagal memuat evaluasi");
      }
    });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listStoryEvaluations(storyId);
        if (!cancelled) setEvals(rows);
      } catch {
        if (!cancelled) setLoadError("Gagal memuat evaluasi");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId]);
  function onLoadPreset(catName: string) {
    const preset =
      RESEARCH_INDICATOR_PRESETS[catName] ??
      RESEARCH_INDICATOR_PRESETS["Bergiliran"];
    if (!preset) return;
    setError(null);
    startTransition(async () => {
      const res = await saveStoryEvaluation({
        storyId,
        title: preset.title,
        description: `Indikator observasi perilaku sosial empiris (tesis Dyah Fitriana) kategori ${catName}.`,
        items: preset.items.map((prompt, idx) => ({
          prompt,
          itemType: "TEXT",
          sortOrder: idx + 1,
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reload();
      router.refresh();
    });
  }
  function onCreateEval(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStoryEvaluation({
        storyId,
        title: title.trim(),
        description: "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      reload();
      router.refresh();
    });
  }

  function onDeleteEval(evaluationId: string) {
    if (!window.confirm("Hapus evaluasi ini beserta semua item?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteStoryEvaluation({ evaluationId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reload();
      router.refresh();
    });
  }

  function onAddItem(evaluationId: string) {
    const prompt = (itemDrafts[evaluationId] ?? "").trim();
    if (!prompt) return;
    setError(null);
    startTransition(async () => {
      const result = await createEvaluationItem({
        evaluationId,
        prompt,
        itemType: "TEXT",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItemDrafts((prev) => ({ ...prev, [evaluationId]: "" }));
      reload();
      router.refresh();
    });
  }

  function onDeleteItem(itemId: string) {
    if (!window.confirm("Hapus item evaluasi ini?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteEvaluationItem({ itemId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reload();
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Evaluasi sesi
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Template pertanyaan untuk orang dewasa saat memandu sesi. Bukan skor
          atau ranking — observasi singkat setelah cerita.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {loadError}
        </p>
      ) : null}

      {evals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--text,#1f2933)]">
            Belum ada template evaluasi
          </p>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Gunakan indikator teruji empiris riset CERMIN atau buat pertanyaan khusus di bawah.
          </p>
          {!readOnly ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="min-h-11 bg-[var(--cermin-accent,#3d7c6b)] text-white hover:bg-[var(--cermin-focus,#0b6e4f)]"
                disabled={pending}
                onClick={() => onLoadPreset(categoryName ?? "Bergiliran")}
              >
                {pending
                  ? "Memuat…"
                  : `Muat Indikator Standar Riset (${categoryName || "Bergiliran"})`}
              </Button>
              {categoryName !== "Menerima Kemenangan dan Kekalahan" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={pending}
                  onClick={() => onLoadPreset("Menerima Kemenangan dan Kekalahan")}
                >
                  Muat Indikator Menang/Kalah
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={pending}
                  onClick={() => onLoadPreset("Bergiliran")}
                >
                  Muat Indikator Bergiliran
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-6">
          {evals.map((ev) => (
            <li
              key={ev.id}
              className="space-y-3 border-t border-[var(--border,#d9e2ec)] pt-4 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--text,#1f2933)]">
                  {ev.title}
                </p>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={pending}
                    onClick={() => onDeleteEval(ev.id)}
                  >
                    Hapus evaluasi
                  </Button>
                ) : null}
              </div>

              <ul className="space-y-2">
                {ev.items.map((item, idx) => (
                  <li
                    key={item.id}
                    className="cermin-hover-card flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-3 py-2"
                  >
                    <p className="text-sm text-[var(--text,#1f2933)]">
                      <span className="text-[var(--cermin-muted,#5c6b73)]">
                        {idx + 1}.{" "}
                      </span>
                      {item.prompt}
                      <span className="ml-2 text-xs text-[var(--cermin-muted,#5c6b73)]">
                        ({item.itemType === "SCALE" ? "Skala 1–5" : "Teks"})
                      </span>
                    </p>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11"
                        disabled={pending}
                        onClick={() => onDeleteItem(item.id)}
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>

              {!readOnly ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`item-${ev.id}`}>Item baru</Label>
                    <Input
                      id={`item-${ev.id}`}
                      value={itemDrafts[ev.id] ?? ""}
                      onChange={(e) =>
                        setItemDrafts((prev) => ({
                          ...prev,
                          [ev.id]: e.target.value,
                        }))
                      }
                      disabled={pending}
                      placeholder="Contoh: Apakah anak menunggu giliran?"
                    />
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={pending || !(itemDrafts[ev.id] ?? "").trim()}
                      onClick={() => onAddItem(ev.id)}
                    >
                      Tambah item
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!readOnly ? (
        <div className="space-y-4 border-t border-[var(--border,#d9e2ec)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-[var(--cermin-muted,#5c6b73)]">
              Riset CERMIN (Dyah Fitriana)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 text-xs"
                disabled={pending}
                onClick={() => onLoadPreset(categoryName ?? "Bergiliran")}
              >
                + Template Standar {categoryName || "Bergiliran"}
              </Button>
            </div>
          </div>
          <form onSubmit={onCreateEval} className="space-y-3">
            <div className="space-y-1.5">
            <Label htmlFor="eval-title">Template evaluasi baru</Label>
            <Input
              id="eval-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
              placeholder="Contoh: Evaluasi bergiliran"
              required
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              className="min-h-11 w-full sm:w-auto"
              disabled={pending || !title.trim()}
            >
              {pending ? "Menyimpan…" : "Tambah evaluasi"}
            </Button>
          </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
