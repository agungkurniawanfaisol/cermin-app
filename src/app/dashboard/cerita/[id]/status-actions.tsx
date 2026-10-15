"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionStoryStatus } from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import type { StoryStatusValue } from "@/server/validations/story";

const ACTION_LABEL: Record<string, string> = {
  REVIEW: "Ajukan review",
  APPROVED: "Setujui",
  PUBLISHED: "Publikasikan",
  ARCHIVED: "Arsipkan",
  DRAFT: "Kembalikan ke draf",
};

export function StatusActions({
  storyId,
  targets,
}: {
  storyId: string;
  targets: StoryStatusValue[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onTransition(toStatus: StoryStatusValue) {
    setError(null);
    if (toStatus === "ARCHIVED") {
      if (!window.confirm("Arsipkan cerita ini?")) return;
    }
    if (toStatus === "PUBLISHED") {
      if (!window.confirm("Publikasikan cerita ini?")) return;
    }
    startTransition(async () => {
      const result = await transitionStoryStatus({ storyId, toStatus });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (targets.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {targets.map((to) => (
          <Button
            key={to}
            type="button"
            className="min-h-11 w-full sm:w-auto"
            variant={to === "ARCHIVED" ? "outline" : "default"}
            disabled={pending}
            onClick={() => onTransition(to)}
          >
            {ACTION_LABEL[to] ?? to}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
