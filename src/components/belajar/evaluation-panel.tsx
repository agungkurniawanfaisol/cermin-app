"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listSessionEvaluationItems,
  upsertSessionEvaluationResponse,
  type SessionEvalItemView,
} from "@/server/actions/evaluations";

export function EvaluationPanel({
  sessionId,
  disabled,
}: {
  sessionId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SessionEvalItemView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listSessionEvaluationItems(sessionId);
        if (cancelled) return;
        setItems(rows);
        const next: Record<string, string> = {};
        for (const row of rows) {
          if (row.response?.value != null) {
            next[row.id] = String(row.response.value);
          } else {
            next[row.id] = "";
          }
        }
        setDrafts(next);
      } catch {
        if (!cancelled) setError("Gagal memuat evaluasi");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  function onSave(itemId: string, itemType: string) {
    setError(null);
    const raw = (drafts[itemId] ?? "").trim();
    if (!raw) {
      setError("Isi jawaban terlebih dahulu");
      return;
    }
    let value: string | number = raw;
    if (itemType === "SCALE") {
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n) || n < 1 || n > 5) {
        setError("Skala harus 1–5");
        return;
      }
      value = n;
    }

    startTransition(async () => {
      const result = await upsertSessionEvaluationResponse({
        sessionId,
        evaluationItemId: itemId,
        value,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <aside className="mt-4 border-t border-[#d9e2ec] pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center text-base font-semibold text-[#5c6b73] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d7c6b]"
        aria-expanded={open}
      >
        {open ? "Sembunyikan evaluasi" : "Evaluasi sesi"}
      </button>

      {open ? (
        <div className="mt-4 space-y-4 rounded-xl border border-[#d9e2ec] bg-white/80 p-4 text-base">
          {items.length === 0 ? (
            <p className="text-[#5c6b73]">
              Cerita ini belum punya template evaluasi.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="space-y-2">
                  <p className="text-sm font-medium text-[#5c6b73]">
                    {item.evaluationTitle}
                  </p>
                  <label
                    htmlFor={`eval-${item.id}`}
                    className="block font-medium text-[#1f2933]"
                  >
                    {item.prompt}
                  </label>
                  {item.itemType === "SCALE" ? (
                    <select
                      id={`eval-${item.id}`}
                      value={drafts[item.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      disabled={pending || disabled}
                      className="min-h-11 w-full rounded-lg border border-[#d9e2ec] bg-white px-3 text-base"
                    >
                      <option value="">Pilih 1–5</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      id={`eval-${item.id}`}
                      value={drafts[item.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      rows={2}
                      disabled={pending || disabled}
                      className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-base"
                      placeholder="Jawaban singkat…"
                    />
                  )}
                  {!disabled ? (
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onSave(item.id, item.itemType)}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#3d7c6b] px-4 font-semibold text-white disabled:opacity-50 sm:w-auto"
                      >
                        {pending ? "Menyimpan…" : "Simpan"}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {disabled ? (
            <p className="text-[#5c6b73]">
              Sesi sudah berakhir. Evaluasi tidak dapat diubah.
            </p>
          ) : null}

          {error ? (
            <p className="text-[#9b1c1c]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
