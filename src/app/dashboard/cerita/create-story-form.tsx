"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStory } from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CategoryOption = { id: string; name: string };

export function CreateStoryForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStory({
        categoryId,
        title,
        description: description || undefined,
        learningObjectives: learningObjectives || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/cerita/${result.data.id}`);
      router.refresh();
    });
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-[var(--muted,#5c6b73)]">
        Tidak ada kategori aktif. Jalankan seed database terlebih dahulu.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6 shadow-sm">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="story-category">Kategori</Label>
          <select
            id="story-category"
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-[var(--border,#d9e2ec)] bg-white px-3 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="story-title">Judul</Label>
          <Input
            id="story-title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="story-desc">Deskripsi (opsional)</Label>
          <Textarea
            id="story-desc"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="story-objectives">Tujuan belajar (opsional)</Label>
          <Textarea
            id="story-objectives"
            name="learningObjectives"
            rows={2}
            value={learningObjectives}
            onChange={(e) => setLearningObjectives(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="h-9" disabled={pending}>
            {pending ? "Menyimpan…" : "Buat draf cerita"}
          </Button>
        </div>
      </form>
      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
