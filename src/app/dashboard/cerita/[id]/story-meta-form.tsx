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
      setMessage("Tersimpan.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
        Metadata
      </h2>
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="meta-category">Kategori</Label>
          <select
            id="meta-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={pending || readOnly}
            className="flex h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-base disabled:opacity-60"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-title">Judul</Label>
          <Input
            id="meta-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending || readOnly}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-desc">Deskripsi</Label>
          <Textarea
            id="meta-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending || readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-objectives">Tujuan belajar</Label>
          <Textarea
            id="meta-objectives"
            rows={3}
            value={learningObjectives}
            onChange={(e) => setLearningObjectives(e.target.value)}
            disabled={pending || readOnly}
          />
        </div>
        {!readOnly ? (
          <div>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan metadata"}
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
        <p className="text-sm text-[var(--accent,#3d7c6b)]">{message}</p>
      ) : null}
    </div>
  );
}
