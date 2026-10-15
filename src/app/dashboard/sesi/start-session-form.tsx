"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startLearningSession } from "@/server/actions/sessions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type StudentOption = { id: string; displayName: string };
type StoryOption = { id: string; title: string; categoryName: string };

export function StartSessionForm({
  students,
  stories,
}: {
  students: StudentOption[];
  stories: StoryOption[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [storyId, setStoryId] = useState(stories[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startLearningSession({ studentId, storyId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/belajar/${result.data.id}`);
    });
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-[var(--muted,#5c6b73)]">
        Belum ada murid yang dapat Anda akses.
      </p>
    );
  }

  if (stories.length === 0) {
    return (
      <p className="text-sm text-[var(--muted,#5c6b73)]">
        Belum ada cerita terbit. Minta admin menerbitkan cerita terlebih dahulu.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-6 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="sesi-murid">Murid</Label>
        <select
          id="sesi-murid"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={pending}
          className="flex h-9 w-full rounded-md border border-[var(--border,#d9e2ec)] bg-white px-3 text-sm"
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sesi-cerita">Cerita terbit</Label>
        <select
          id="sesi-cerita"
          required
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          disabled={pending}
          className="flex h-9 w-full rounded-md border border-[var(--border,#d9e2ec)] bg-white px-3 text-sm"
        >
          {stories.map((story) => (
            <option key={story.id} value={story.id}>
              {story.categoryName} — {story.title}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Memulai…" : "Mulai sesi belajar"}
      </Button>
    </form>
  );
}
