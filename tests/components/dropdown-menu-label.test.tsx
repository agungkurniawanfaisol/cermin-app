/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

afterEach(() => {
  cleanup();
});

describe("DropdownMenuLabel", () => {
  it("renders as plain header without Menu.Group (no Base UI Group context error)", () => {
    expect(() => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Buka</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Judul akun</DropdownMenuLabel>
            <DropdownMenuItem>Aksi</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    }).not.toThrow();

    expect(screen.getByText("Judul akun")).toBeInTheDocument();
    expect(
      document.querySelector("[data-slot='dropdown-menu-label']"),
    ).toBeTruthy();
  });
});
