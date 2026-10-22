"use client";

import { useEffect, useState } from "react";
import {
  listSessionMcqSummary,
  type SessionMcqSummaryRow,
} from "@/server/actions/evaluations";

export function EvaluationPanel({
  sessionId,
  studentName,
}: {
  sessionId: string;
  studentId: string;
  studentName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SessionMcqSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await listSessionMcqSummary(sessionId);
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError("Gagal memuat ringkasan soal");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  return (
    <section className="mt-8 rounded-2xl border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] p-4 sm:mt-10 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-base font-semibold text-[var(--belajar-ink,#1f2933)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
        aria-expanded={open}
      >
        <span>Ringkasan soal{studentName ? ` · ${studentName}` : ""}</span>
        <span className="text-sm font-normal text-[var(--belajar-quiet,#5c6b73)]">
          {open ? "Tutup" : "Buka"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {error ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {error}
            </p>
          ) : null}
          {rows.length === 0 && !error ? (
            <p className="text-sm text-[var(--belajar-quiet,#5c6b73)]">
              Cerita ini belum punya soal di halaman, atau belum ada jawaban.
            </p>
          ) : null}
          <ul className="space-y-3">
            {rows.map((row) => {
              const choiceLabel = (key: string) =>
                row.choices.find((c) => c.key === key)?.labelText.trim() || key;
              return (
                <li
                  key={row.pageMcqId}
                  className="rounded-xl border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-accent-soft,#e6f2ee)]/40 px-3 py-3"
                >
                  <p className="text-xs font-medium text-[var(--belajar-quiet,#5c6b73)]">
                    Halaman {row.pageSortOrder}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--belajar-ink,#1f2933)]">
                    {row.prompt}
                  </p>
                  <p className="mt-2 text-sm text-[var(--belajar-ink,#1f2933)]">
                    Jawaban:{" "}
                    <span className="font-semibold">
                      {row.selectedKey
                        ? `${row.selectedKey} — ${choiceLabel(row.selectedKey)}`
                        : "Belum dijawab"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--belajar-quiet,#5c6b73)]">
                    Kunci (dewasa): {row.correctKey} —{" "}
                    {choiceLabel(row.correctKey)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
