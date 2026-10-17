/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeStoryDialog } from "@/components/belajar/change-story-dialog";
import * as sessionsModule from "@/server/actions/sessions";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("ChangeStoryDialog - Mid-session Story Switching", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const stories: sessionsModule.PublishedStoryOption[] = [
    {
      id: "story-1",
      title: "Giliran Bermain",
      description: "",
      categoryId: "cat-1",
      categoryName: "Bergiliran",
      categoryDescription: null,
      categoryCoverUrl: null,
      pageCount: 1,
      coverMediaId: null,
    },
    {
      id: "story-2",
      title: "Antre di Kantin",
      description: "",
      categoryId: "cat-1",
      categoryName: "Bergiliran",
      categoryDescription: null,
      categoryCoverUrl: null,
      pageCount: 1,
      coverMediaId: null,
    },
    {
      id: "story-3",
      title: "Mengenal Rasa Marah",
      description: "",
      categoryId: "cat-2",
      categoryName: "Emosi & Regulasi",
      categoryDescription: null,
      categoryCoverUrl: null,
      pageCount: 1,
      coverMediaId: null,
    },
  ];

  it("opens dialog, filters stories by category, and triggers session start", async () => {
    const startLearningSessionSpy = vi
      .spyOn(sessionsModule, "startLearningSession")
      .mockResolvedValue({
        ok: true,
        data: { id: "new-session-456" },
      });

    render(
      <ChangeStoryDialog
        studentId="student-1"
        currentStoryId="story-1"
        stories={stories}
      />,
    );

    // Click trigger button to open dialog
    const trigger = screen.getByRole("button", { name: /ganti cerita/i });
    fireEvent.click(trigger);

    // Verify dialog content is visible
    expect(screen.getByText("Ganti Cerita Belajar")).toBeDefined();

    const categorySelect = screen.getByLabelText(
      "Kategori cerita",
    ) as HTMLSelectElement;
    const storySelect = screen.getByLabelText(
      "Judul cerita",
    ) as HTMLSelectElement;

    // Default category should match current story's category (cat-1: Bergiliran)
    expect(categorySelect.value).toBe("cat-1");
    expect(storySelect.value).toBe("story-1");

    // Change category to cat-2 (Emosi & Regulasi)
    fireEvent.change(categorySelect, { target: { value: "cat-2" } });

    expect(categorySelect.value).toBe("cat-2");
    expect(storySelect.value).toBe("story-3");

    // Submit dialog form
    const submitBtn = screen.getByRole("button", { name: "Mulai Cerita Ini" });
    fireEvent.click(submitBtn);

    expect(startLearningSessionSpy).toHaveBeenCalledWith({
      studentId: "student-1",
      storyId: "story-3",
    });
  });
});
