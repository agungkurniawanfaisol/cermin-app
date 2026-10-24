/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionStartEntry } from "@/app/dashboard/sesi/session-start-entry";
import { SessionStartFlow } from "@/app/dashboard/sesi/session-start-flow";
import * as sessionsModule from "@/server/actions/sessions";

const pushMock = vi.fn();
const historyPushState = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => "/sesi/mulai",
}));

describe("Session start — entry + fullscreen wizard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal("history", {
      ...window.history,
      pushState: historyPushState,
    });
  });

  const students = [
    { id: "student-1", displayName: "Alya" },
    { id: "student-2", displayName: "Budi" },
  ];

  const stories: sessionsModule.PublishedStoryOption[] = [
    {
      id: "story-1",
      title: "Giliran Bermain",
      description: "Cerita bergiliran.",
      categoryId: "cat-1",
      categoryName: "Bergiliran",
      categoryDescription: "Belajar menunggu giliran",
      categoryCoverUrl: null,
      pageCount: 4,
      coverMediaId: null,
    },
    {
      id: "story-2",
      title: "Antre di Kantin",
      description: "",
      categoryId: "cat-1",
      categoryName: "Bergiliran",
      categoryDescription: "Belajar menunggu giliran",
      categoryCoverUrl: null,
      pageCount: 3,
      coverMediaId: null,
    },
    {
      id: "story-3",
      title: "Mengenal Rasa Marah",
      description: "Emosi",
      categoryId: "cat-2",
      categoryName: "Emosi & Regulasi",
      categoryDescription: null,
      categoryCoverUrl: null,
      pageCount: 5,
      coverMediaId: null,
    },
  ];

  it("entry play link goes to fullscreen tanpa studentId", () => {
    render(
      <SessionStartEntry hasStudents hasPublishedStories />,
    );

    const link = screen.getByRole("link", { name: /Mulai Sesi/i });
    expect(link.getAttribute("href")).toBe("/sesi/mulai?step=category");
  });

  it("fullscreen wizard filters stories by category tanpa pilih murid dulu", () => {
    render(
      <SessionStartFlow
        students={students}
        stories={stories}
        initialStep="category"
        fullscreen
      />,
    );

    expect(screen.getByRole("region", { name: "Pilih kategori cerita" })).toBeTruthy();
    expect(screen.queryByLabelText("Murid")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Bergiliran/i }));
    const storyNav = String(historyPushState.mock.calls.at(-1)?.[2] ?? "");
    expect(storyNav).toContain("step=story");
    expect(storyNav).toContain("categoryId=cat-1");
    expect(storyNav).not.toContain("studentId=");

    expect(
      screen.getByRole("region", { name: /Pilih cerita: Bergiliran/i }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Murid")).toBeNull();
    expect(screen.getByRole("button", { name: /Giliran Bermain/i })).toBeTruthy();
    expect(screen.getByText("Giliran Bermain")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Mengenal Rasa Marah/i }),
    ).toBeNull();
  });

  it("starts session from preview", async () => {
    const startLearningSessionSpy = vi
      .spyOn(sessionsModule, "startLearningSession")
      .mockResolvedValue({
        ok: true,
        data: { id: "session-123" },
      });

    render(
      <SessionStartFlow
        students={students}
        stories={stories}
        initialStep="preview"
        initialCategoryId="cat-2"
        initialStoryId="story-3"
        fullscreen
      />,
    );

    expect(screen.queryByLabelText("Murid")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Mulai Cerita/i }));

    await waitFor(() => {
      expect(startLearningSessionSpy).toHaveBeenCalledWith({
        studentId: "student-1",
        storyId: "story-3",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/belajar/session-123");
  });

  it("paginates categories in short landscape viewport when categories > 2", () => {
    window.innerWidth = 844;
    window.innerHeight = 390;

    const manyStories: sessionsModule.PublishedStoryOption[] = [
      ...stories,
      {
        id: "story-4",
        title: "Menyapa Teman",
        description: "Sosialisasi",
        categoryId: "cat-3",
        categoryName: "Komunikasi",
        categoryDescription: "Berbicara santun",
        categoryCoverUrl: null,
        pageCount: 3,
        coverMediaId: null,
      },
    ];

    render(
      <SessionStartFlow
        students={students}
        stories={manyStories}
        initialStep="category"
        fullscreen
      />,
    );

    expect(screen.getByRole("button", { name: /Bergiliran/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Emosi & Regulasi/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Komunikasi/i })).toBeNull();

    const nextBtn = screen.getByRole("button", { name: /Kategori berikutnya/i });
    expect(nextBtn).toBeTruthy();
    fireEvent.click(nextBtn);

    expect(screen.getByRole("button", { name: /Komunikasi/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bergiliran/i })).toBeNull();
  });

  it("handles cancel button navigation to /dashboard/sesi", () => {
    render(
      <SessionStartFlow
        students={students}
        stories={stories}
        initialStep="category"
        fullscreen
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/sesi");
  });
});
