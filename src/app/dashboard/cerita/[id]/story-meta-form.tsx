"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStory } from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CategoryOption = { id: string; name: string };

export function StoryMetaForm({
  storyId,
  initial,
  categories,
  readOnly,
}: {
  storyId: string;
  initial: {
    categoryId: string;
    title: string;
    description: string;
    learningObjectives: string;
  };
  categories: CategoryOption[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [learningObjectives, setLearningObjectives] = useState(
    initial.learningObjectives,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateStory({
        id: storyId,
        categoryId,
        title,
        description,
        learningObjectives,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Identitas cerita tersimpan.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Identitas cerita
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Informasi yang dilihat terapis dan orang tua di daftar cerita — bukan
          teks yang dibaca anak di child mode.
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="meta-category">Kategori</Label>
          <select
            id="meta-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={pending || readOnly}
            className="flex h-11 w-full rounded-lg border border-[var(--border,#d9e2ec)] bg-white px-3 text-base text-[var(--text,#1f2933)] disabled:opacity-60"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
            Hanya kategori aktif yang bisa dipilih.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="meta-title">Judul</Label>
          <Input
            id="meta-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending || readOnly}
            required
            placeholder="Contoh: Menunggu giliran bermain"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="meta-desc">Deskripsi</Label>
          <Textarea
            id="meta-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending || readOnly}
            placeholder="Ringkas situasi sosial yang dilatih cerita ini."
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="meta-objectives">Tujuan belajar</Label>
          <Textarea
            id="meta-objectives"
            rows={3}
            value={learningObjectives}
            onChange={(e) => setLearningObjectives(e.target.value)}
            disabled={pending || readOnly}
            placeholder="Contoh: Anak menunggu giliran tanpa mendorong."
          />
        </div>
        {!readOnly ? (
          <div className="flex w-full flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              className="min-h-11 w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? "Menyimpan…" : "Simpan identitas"}
            </Button>
          </div>
        ) : null}
      </form>
      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--success,#2f6f4e)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
