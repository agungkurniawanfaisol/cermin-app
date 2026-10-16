"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createStory } from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CategoryOption = { id: string; name: string };

const ROADMAP = [
  {
    title: "Buat draf identitas",
    body: "Pilih kategori, judul, dan tujuan belajar — langkah ini.",
  },
  {
    title: "Susun halaman & media",
    body: "Tulis teks tenang, unggah gambar (umum atau khusus murid) dan audio.",
  },
  {
    title: "Evaluasi & terbitkan",
    body: "Tambah pertanyaan observasi, lalu ajukan review atau publikasikan.",
  },
] as const;

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
      <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
        Tidak ada kategori aktif. Jalankan seed database terlebih dahulu.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
            Langkah 1 — Identitas draf
          </h2>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Setelah disimpan, Anda langsung masuk ke editor langkah demi langkah
            untuk halaman, media, evaluasi, dan status.
          </p>
        </div>
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
              className="flex h-11 w-full rounded-lg border border-[var(--border,#d9e2ec)] bg-white px-3 text-base text-[var(--text,#1f2933)]"
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
              placeholder="Contoh: Antri di kantin"
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
              placeholder="Ringkas situasi yang dilatih."
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
              placeholder="Apa yang diharapkan berubah setelah sesi?"
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              className="min-h-11 w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? "Menyimpan…" : "Buat draf & lanjut ke editor"}
            </Button>
          </div>
        </form>
        {error ? (
          <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <aside className="rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--text,#1f2933)]">
          Alur pembuatan
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Cerita sosial CERMIN dibuat bertahap agar mudah ditinjau dan aman
          sebelum dipakai bersama anak.
        </p>
        <ol className="mt-4 space-y-4">
          {ROADMAP.map((item, index) => (
            <li key={item.title} className="flex gap-3">
              <span
                className={
                  index === 0
                    ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--cermin-accent,#3d7c6b)] text-xs font-semibold text-white"
                    : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[var(--cermin-muted,#5c6b73)] ring-1 ring-[var(--border,#d9e2ec)]"
                }
                aria-hidden
              >
                {index === 0 ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text,#1f2933)]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--cermin-muted,#5c6b73)]">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
