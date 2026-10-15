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
      <p className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 py-6 text-sm text-[var(--cermin-muted,#5c6b73)]">
        Belum ada murid yang dapat Anda akses. Minta admin menugaskan atau
        menautkan murid terlebih dahulu.
      </p>
    );
  }

  if (stories.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white px-4 py-6 text-sm text-[var(--cermin-muted,#5c6b73)]">
        Belum ada cerita terbit. Minta admin menerbitkan cerita terlebih dahulu.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full space-y-4 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="space-y-2">
        <Label htmlFor="sesi-murid">Murid</Label>
        <select
          id="sesi-murid"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={pending}
          className="flex h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-base text-[var(--text,#1f2933)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
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
          className="flex h-11 w-full rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-white px-3 text-base text-[var(--text,#1f2933)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
        >
          {stories.map((story) => (
            <option key={story.id} value={story.id}>
              {story.categoryName} — {story.title}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p
          className="text-sm text-[var(--danger,#9b2c2c)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Memulai…" : "Mulai sesi belajar"}
      </Button>
    </form>
  );
}
