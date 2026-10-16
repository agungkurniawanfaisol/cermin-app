// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { compressImage } from "@/lib/image-compress";

describe("compressImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns non-image files as is without processing", async () => {
    const audioFile = new File(["dummy audio"], "audio.mp3", {
      type: "audio/mpeg",
    });
    const result = await compressImage(audioFile);
    expect(result).toBe(audioFile);
  });

  it("scales and compresses image to WebP with aspect ratio preserved", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const mockBlob = new Blob(["compressed webp bytes"], { type: "image/webp" });

    const canvasMock = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback: (b: Blob | null) => void, format: string) => {
        callback(mockBlob);
      }),
    };

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") return canvasMock as unknown as HTMLCanvasElement;
      return originalCreateElement(tagName);
    });

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue();

    globalThis.Image = class {
      naturalWidth = 2560;
      naturalHeight = 1440;
      width = 2560;
      height = 1440;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        queueMicrotask(() => this.onload?.());
      }
    } as unknown as typeof Image;

    const largeFile = new File(["large raw bytes"], "foto-anak.jpg", {
      type: "image/jpeg",
    });

    const compressed = await compressImage(largeFile, {
      maxDimension: 1280,
      quality: 0.8,
    });

    expect(compressed).toBeDefined();
    expect(compressed.name).toBe("foto-anak.webp");
    expect(compressed.type).toBe("image/webp");
    expect(canvasMock.width).toBe(1280);
    expect(canvasMock.height).toBe(720);
  });

  it("falls back to JPEG if WebP generation yields null", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const jpegBlob = new Blob(["jpeg bytes"], { type: "image/jpeg" });

    const canvasMock = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback: (b: Blob | null) => void, format: string) => {
        if (format === "image/webp") {
          callback(null); // WebP unsupported
        } else {
          callback(jpegBlob);
        }
      }),
    };

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") return canvasMock as unknown as HTMLCanvasElement;
      return originalCreateElement(tagName);
    });

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue();

    globalThis.Image = class {
      naturalWidth = 800;
      naturalHeight = 600;
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        queueMicrotask(() => this.onload?.());
      }
    } as unknown as typeof Image;

    const file = new File(["sample bytes"], "test.png", { type: "image/png" });
    const compressed = await compressImage(file, { format: "image/webp" });

    expect(compressed).toBeDefined();
    expect(compressed.name).toBe("test.jpg");
    expect(compressed.type).toBe("image/jpeg");
  });
});
