/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionReader } from "@/components/belajar/session-reader";
import type { SessionForReader } from "@/server/actions/sessions";

const refreshMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: pushMock,
  }),
}));

vi.mock("@/server/actions/sessions", () => ({
  updateSessionStudent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  endLearningSession: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  addObservation: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

vi.mock("@/server/actions/evaluations", () => ({
  upsertSessionMcqResponse: vi.fn().mockResolvedValue({
    ok: true,
    data: { isCorrect: true, correctKey: "A" },
  }),
  listSessionMcqSummary: vi.fn().mockResolvedValue([]),
}));

describe("Belajar Landscape & Full-Screen Snap Viewport Layout", () => {
  const scrollIntoViewMock = vi.fn();
  const scrollToMock = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    Element.prototype.scrollTo = scrollToMock;
    window.scrollTo = scrollToMock;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockSession: SessionForReader = {
    id: "session-123",
    startedAt: new Date("2025-01-01T08:00:00Z"),
    endedAt: null,
    student: { id: "student-1", displayName: "Budi Santoso" },
    studentOptions: [
      { id: "student-1", displayName: "Budi Santoso" },
      { id: "student-2", displayName: "Siti Rahma" },
    ],
    story: {
      id: "story-abc",
      title: "Belajar Mengantre",
      categoryName: "Kemandirian",
    },
    availableStories: [],
    preference: {
      textSize: "MD",
      audioEnabled: true,
    },
    observations: [],
    pages: [
      {
        id: "page-1",
        pageNumber: 1,
        bodyText: "Budi berdiri rapi di belakang teman-temannya.",
        portraitImage: null,
        portraitsByStudentId: {},
        storyImages: [],
        storyAudios: [{ id: "audio-1", label: "Narasi Halaman 1", url: "/audio1.mp3" }],
        mcq: {
          id: "mcq-1",
          pageId: "page-1",
          prompt: "Di mana Budi berdiri?",
          promptImageUrl: null,
          selectedKey: null,
          isCorrect: null,
          choices: [
            { key: "A", labelText: "Di belakang teman", imageUrl: null },
            { key: "B", labelText: "Di luar ruangan", imageUrl: null },
          ],
        },
      },
      {
        id: "page-2",
        pageNumber: 2,
        bodyText: "Budi menunggu dengan sabar sampai gilirannya tiba.",
        portraitImage: null,
        portraitsByStudentId: {},
        storyImages: [],
        storyAudios: [],
        mcq: null,
      },
    ],
  };

  it("renders container with snap classes and Screen 1 locked to 100dvh", () => {
    const { container } = render(<SessionReader session={mockSession} />);

    // Container has .belajar-viewport-container
    const main = container.querySelector("main");
    expect(main).toHaveClass("belajar-viewport-container");

    // Screen 1: Layar cerita
    const storyScreen = screen.getByRole("region", { name: "Layar cerita" });
    expect(storyScreen).toHaveClass("belajar-snap-page");
    expect(storyScreen).toHaveClass("h-dvh");
    expect(storyScreen).toHaveClass("max-h-dvh");
    expect(storyScreen).toHaveClass("overflow-hidden");

    // Header within Screen 1
    expect(screen.getByText("Belajar Mengantre")).toBeInTheDocument();
    expect(screen.getByText("Kemandirian")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();

    // Stage within Screen 1
    expect(
      screen.getByText("Budi berdiri rapi di belakang teman-temannya."),
    ).toBeInTheDocument();

    // Docked bottom nav within Screen 1
    const nav = screen.getByRole("navigation", { name: "Navigasi halaman" });
    expect(nav).toHaveClass("belajar-nav-docked");

    const prevButton = screen.getByRole("button", { name: /Sebelumnya/i });
    expect(prevButton).toBeDisabled();

    const nextButton = within(nav).getByRole("button", { name: /Berikutnya/i });
    expect(nextButton).toBeEnabled();

    // MCQ clue in nav bar and prompt card in stage
    const mcqNavClue = within(nav).getByRole("button", { name: /Klik ke bawah/i });
    expect(mcqNavClue).toBeInTheDocument();

    expect(
      screen.getByText(/Ada pertanyaan untukmu di bawah!/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Klik ke Bawah untuk Menjawab/i }),
    ).toBeInTheDocument();
  });
  it("renders Screen 2 (MCQ) as a full-screen snap page when mcq exists", () => {
    render(<SessionReader session={mockSession} />);

    const mcqScreen = screen.getByRole("region", { name: "Layar soal pilihan" });
    expect(mcqScreen).toHaveClass("belajar-snap-page");
    expect(mcqScreen).toHaveClass("h-dvh");

    // MCQ question prompt is rendered
    expect(screen.getByText("Di mana Budi berdiri?")).toBeInTheDocument();

    // "Kembali ke cerita" button is present on Screen 2
    const backButtons = screen.getAllByRole("button", {
      name: /Kembali ke cerita/i,
    });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);

    // Clicking "Kembali ke cerita" calls scrollIntoView
    fireEvent.click(backButtons[0]);
    expect(scrollIntoViewMock).toHaveBeenCalled();

    // Downward cues are present on Screen 2 to scroll to Screen 3 (Adult notes)
    const mcqDownBtn = within(mcqScreen).getByRole("button", {
      name: /catatan sesi orang dewasa/i,
    });
    expect(mcqDownBtn).toBeInTheDocument();

    const mcqTopDownBtn = within(mcqScreen).getByRole("button", {
      name: "Klik ke bawah untuk catatan sesi",
    });
    expect(mcqTopDownBtn).toBeInTheDocument();
    fireEvent.click(mcqDownBtn);
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
  it("renders Screen 3 (Adult Viewport) as a snap page below story", () => {
    render(<SessionReader session={mockSession} />);

    const adultScreen = screen.getByRole("region", {
      name: "Untuk orang dewasa",
    });
    expect(adultScreen).toHaveClass("belajar-snap-page");
    expect(adultScreen).toHaveClass("min-h-dvh");

    // Back to dashboard link and adult panel are present
    expect(
      screen.getByRole("link", { name: /Kembali ke dasbor/i }),
    ).toBeInTheDocument();
  });

  it("navigates between pages, resets scroll to top, and hides Screen 2 when page has no MCQ", () => {
    render(<SessionReader session={mockSession} />);

    const nextButton = screen.getAllByRole("button", { name: /Berikutnya/i })[0];
    fireEvent.click(nextButton);

    // Page 2 text is displayed
    expect(
      screen.getByText("Budi menunggu dengan sabar sampai gilirannya tiba."),
    ).toBeInTheDocument();
    expect(screen.getByText("2/2")).toBeInTheDocument();

    // Scroll reset was executed
    expect(scrollToMock).toHaveBeenCalled();

    // Page 2 has no MCQ -> Screen 2 should not exist
    expect(
      screen.queryByRole("region", { name: "Layar soal pilihan" }),
    ).not.toBeInTheDocument();

    // On last page, "Berikutnya" becomes "Selesaikan Cerita"
    const finishButton = screen.getByRole("button", {
      name: /Selesaikan Cerita/i,
    });
    expect(finishButton).toBeInTheDocument();

    // Previous button is now enabled
    const prevButton = screen.getByRole("button", { name: /Sebelumnya/i });
    expect(prevButton).toBeEnabled();

    // Clicking finish story displays completion message and scrolls into adult section
    fireEvent.click(finishButton);
    expect(
      screen.getByText(/Cerita selesai\. Terima kasih sudah membaca bersama\./i),
    ).toBeInTheDocument();
  });
});
