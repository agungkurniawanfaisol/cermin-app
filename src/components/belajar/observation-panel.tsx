"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addObservation } from "@/server/actions/sessions";

type ObservationItem = {
  id: string;
  note: string;
  recordedAt: Date | string;
  recordedBy: { id: string; name: string };
};

export function ObservationPanel({
  sessionId,
  observations,
  disabled,
}: {
  sessionId: string;
  observations: ObservationItem[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addObservation({ sessionId, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <aside className="mt-8 border-t border-[#d9e2ec] pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center text-base font-semibold text-[#5c6b73] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d7c6b]"
        aria-expanded={open}
      >
        {open ? "Sembunyikan catatan terapis" : "Catatan terapis"}
      </button>

      {open ? (
        <div className="mt-4 space-y-4 rounded-xl border border-[#d9e2ec] bg-white/80 p-4 text-base">
          {disabled ? (
            <p className="text-[#5c6b73]">
              Sesi sudah berakhir. Catatan baru tidak dapat ditambahkan.
            </p>
          ) : (
            <form onSubmit={onSave} className="space-y-3">
              <label htmlFor="observation-note" className="block font-medium">
                Catatan observasi
              </label>
              <textarea
                id="observation-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={5000}
                disabled={pending}
                className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-base text-[#1f2933]"
                placeholder="Tulis catatan singkat…"
              />
              {error ? (
                <p className="text-[#9b1c1c]" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={pending || note.trim().length === 0}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#3d7c6b] px-4 font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {pending ? "Menyimpan…" : "Simpan"}
              </button>
            </form>
          )}

          <ul className="space-y-3">
            {observations.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[#e4ebe6] bg-[#f7f4ef] px-3 py-2"
              >
                <p className="whitespace-pre-wrap">{item.note}</p>
                <p className="mt-1 text-sm text-[#5c6b73]">
                  {item.recordedBy.name} ·{" "}
                  {new Date(item.recordedAt).toLocaleString("id-ID")}
                </p>
              </li>
            ))}
            {observations.length === 0 ? (
              <li className="text-[#5c6b73]">Belum ada catatan.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
