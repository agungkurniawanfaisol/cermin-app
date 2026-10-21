"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deletePageMcq,
  uploadPageMcqImage,
  upsertPageMcq,
} from "@/server/actions/evaluations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MCQ_MAX_CHOICES,
  MCQ_MIN_CHOICES,
  nextMcqKey,
  type McqKey,
} from "@/server/validations/evaluation";

export type PageMcqChoiceDraft = {
  key: McqKey;
  labelText: string;
  imageKey: string | null;
  imageUrl: string | null;
};

export type PageMcqDraft = {
  id: string | null;
  prompt: string;
  promptImageKey: string | null;
  promptImageUrl: string | null;
  correctKey: McqKey;
  choices: PageMcqChoiceDraft[];
};

export type PageMcqSeed = {
  id: string;
  prompt: string;
  promptImageKey: string | null;
  correctKey: string;
  choices: Array<{
    id: string;
    key: string;
    labelText: string;
    imageKey: string | null;
  }>;
} | null;

function defaultChoices(): PageMcqChoiceDraft[] {
  return [
    { key: "A", labelText: "", imageKey: null, imageUrl: null },
    { key: "B", labelText: "", imageKey: null, imageUrl: null },
  ];
}

function draftFromSeed(seed: PageMcqSeed): PageMcqDraft | null {
  if (!seed) return null;
  const choices = [...seed.choices]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((c) => ({
      key: c.key as McqKey,
      labelText: c.labelText ?? "",
      imageKey: c.imageKey ?? null,
      imageUrl: null,
    }));
  if (choices.length < MCQ_MIN_CHOICES) {
    while (choices.length < MCQ_MIN_CHOICES) {
      const key = nextMcqKey(choices.map((c) => c.key));
      if (!key) break;
      choices.push({ key, labelText: "", imageKey: null, imageUrl: null });
    }
  }
  const correct =
    choices.find((c) => c.key === seed.correctKey)?.key ??
    choices[0]?.key ??
    "A";
  return {
    id: seed.id,
    prompt: seed.prompt,
    promptImageKey: seed.promptImageKey,
    promptImageUrl: null,
    correctKey: correct,
    choices,
  };
}

export function PageMcqEditor({
  pageId,
  seed,
  readOnly,
  onChanged,
}: {
  pageId: string;
  seed: PageMcqSeed;
  readOnly?: boolean;
  onChanged?: (next: PageMcqSeed) => void;
}) {
  const [enabled, setEnabled] = useState(Boolean(seed));
  const [draft, setDraft] = useState<PageMcqDraft | null>(() =>
    draftFromSeed(seed),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(Boolean(seed));
    setDraft(draftFromSeed(seed));
  }, [pageId, seed?.id]);

  function ensureDraft(): PageMcqDraft {
    if (draft) return draft;
    const next: PageMcqDraft = {
      id: null,
      prompt: "",
      promptImageKey: null,
      promptImageUrl: null,
      correctKey: "A",
      choices: defaultChoices(),
    };
    setDraft(next);
    return next;
  }

  function onEnable() {
    setEnabled(true);
    ensureDraft();
  }

  function onAddChoice() {
    setDraft((prev) => {
      const d = prev ?? ensureDraft();
      if (d.choices.length >= MCQ_MAX_CHOICES) return d;
      const key = nextMcqKey(d.choices.map((c) => c.key));
      if (!key) return d;
      return {
        ...d,
        choices: [
          ...d.choices,
          { key, labelText: "", imageKey: null, imageUrl: null },
        ],
      };
    });
  }

  function onRemoveChoice(key: McqKey) {
    setDraft((prev) => {
      const d = prev ?? ensureDraft();
      if (d.choices.length <= MCQ_MIN_CHOICES) return d;
      const choices = d.choices.filter((c) => c.key !== key);
      const correctKey =
        d.correctKey === key ? (choices[0]?.key ?? "A") : d.correctKey;
      return { ...d, choices, correctKey };
    });
  }

  function onSave() {
    const d = ensureDraft();
    setError(null);
    startTransition(async () => {
      const result = await upsertPageMcq({
        pageId,
        prompt: d.prompt,
        correctKey: d.correctKey,
        promptImageKey: d.promptImageKey,
        choices: d.choices.map((c) => ({
          key: c.key,
          labelText: c.labelText,
          imageKey: c.imageKey,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const nextSeed: PageMcqSeed = {
        id: result.data.id,
        prompt: d.prompt,
        promptImageKey: d.promptImageKey,
        correctKey: d.correctKey,
        choices: d.choices.map((c) => ({
          id: `${result.data.id}-${c.key}`,
          key: c.key,
          labelText: c.labelText,
          imageKey: c.imageKey,
        })),
      };
      setDraft({ ...d, id: result.data.id });
      onChanged?.(nextSeed);
    });
  }

  function onDelete() {
    if (!window.confirm("Hapus soal di halaman ini?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePageMcq({ pageId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(false);
      setDraft(null);
      onChanged?.(null);
    });
  }

  async function onUpload(slot: "prompt" | McqKey, file: File | null) {
    if (!file || readOnly) return;
    setError(null);
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.set("pageId", pageId);
      fd.set("slot", slot);
      fd.set("file", file);
      const result = await uploadPageMcqImage(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft((prev) => {
        const base = prev ?? ensureDraft();
        if (slot === "prompt") {
          return {
            ...base,
            promptImageKey: result.data.storageKey,
            promptImageUrl: result.data.url,
          };
        }
        return {
          ...base,
          choices: base.choices.map((c) =>
            c.key === slot
              ? {
                  ...c,
                  imageKey: result.data.storageKey,
                  imageUrl: result.data.url,
                }
              : c,
          ),
        };
      });
    } finally {
      setUploading(null);
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)]/40 px-4 py-6 text-center">
        <p className="text-sm text-[var(--muted,#5c6b73)]">
          Belum ada soal. Opsional: tambah pilihan (teks dan/atau gambar), jumlah
          bebas {MCQ_MIN_CHOICES}–{MCQ_MAX_CHOICES}.
        </p>
        {!readOnly ? (
          <Button
            type="button"
            className="mt-4 min-h-11"
            onClick={onEnable}
          >
            Tambah soal
          </Button>
        ) : null}
      </div>
    );
  }

  const d = draft ?? ensureDraft();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={`mcq-prompt-${pageId}`}>Pertanyaan</Label>
        <Textarea
          id={`mcq-prompt-${pageId}`}
          value={d.prompt}
          disabled={readOnly || pending}
          onChange={(e) => setDraft({ ...d, prompt: e.target.value })}
          rows={3}
          className="min-h-24 w-full"
          placeholder="Contoh: Apa yang dilakukan anak setelah menunggu giliran?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`mcq-prompt-img-${pageId}`}>Gambar soal (opsional)</Label>
        {d.promptImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.promptImageUrl}
            alt=""
            className="max-h-40 rounded-lg border border-[var(--border,#d9e2ec)] object-contain"
          />
        ) : d.promptImageKey ? (
          <p className="text-xs text-[var(--muted,#5c6b73)]">Gambar tersimpan</p>
        ) : null}
        {!readOnly ? (
          <Input
            id={`mcq-prompt-img-${pageId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending || uploading === "prompt"}
            onChange={(e) => {
              void onUpload("prompt", e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-[var(--text,#1f2933)]">
          Pilihan jawaban ({d.choices.length} opsi)
        </legend>
        {d.choices.map((choice) => (
          <div
            key={choice.key}
            className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-3 sm:p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--accent-soft,#e6f2ee)] text-sm font-semibold text-[var(--accent,#3d7c6b)]">
                {choice.key}
              </span>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`mcq-correct-${pageId}`}
                  checked={d.correctKey === choice.key}
                  disabled={readOnly || pending}
                  onChange={() => setDraft({ ...d, correctKey: choice.key })}
                  className="size-4 accent-[var(--accent,#3d7c6b)]"
                />
                Jawaban benar
              </label>
              {!readOnly && d.choices.length > MCQ_MIN_CHOICES ? (
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto min-h-11"
                  disabled={pending}
                  onClick={() => onRemoveChoice(choice.key)}
                >
                  Hapus opsi
                </Button>
              ) : null}
            </div>
            <Input
              value={choice.labelText}
              disabled={readOnly || pending}
              onChange={(e) =>
                setDraft({
                  ...d,
                  choices: d.choices.map((c) =>
                    c.key === choice.key
                      ? { ...c, labelText: e.target.value }
                      : c,
                  ),
                })
              }
              placeholder={`Teks pilihan ${choice.key} (opsional jika ada gambar)`}
              className="mb-2"
            />
            {choice.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={choice.imageUrl}
                alt=""
                className="mb-2 max-h-28 rounded-lg border border-[var(--border,#d9e2ec)] object-contain"
              />
            ) : choice.imageKey ? (
              <p className="mb-2 text-xs text-[var(--muted,#5c6b73)]">
                Gambar tersimpan
              </p>
            ) : null}
            {!readOnly ? (
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending || uploading === choice.key}
                onChange={(e) => {
                  void onUpload(choice.key, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            ) : null}
          </div>
        ))}
        {!readOnly && d.choices.length < MCQ_MAX_CHOICES ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={pending}
            onClick={onAddChoice}
          >
            Tambah pilihan
          </Button>
        ) : null}
      </fieldset>

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            className="min-h-11"
            disabled={pending}
            onClick={onSave}
          >
            {pending ? "Menyimpan…" : "Simpan soal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={onDelete}
          >
            Hapus soal
          </Button>
        </div>
      ) : null}
    </div>
  );
}
