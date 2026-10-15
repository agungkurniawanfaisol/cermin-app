/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const replace = vi.fn();
const push = vi.fn();
const signOut = vi.fn();
const uploadUserAvatar = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace, push }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: (...args: unknown[]) => signOut(...args) },
}));

vi.mock("@/server/actions/avatars", () => ({
  uploadUserAvatar: (...args: unknown[]) => uploadUserAvatar(...args),
}));

import { UserAccountMenu } from "@/components/dashboard/user-account-menu";

afterEach(() => {
  cleanup();
});

describe("UserAccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue(undefined);
    uploadUserAvatar.mockResolvedValue({ ok: true, data: { hasImage: true } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: null }),
      }),
    );
  });

  it("opens without MenuGroupContext error (Base UI GroupLabel)", async () => {
    const user = userEvent.setup();
    render(
      <UserAccountMenu
        name="Admin CERMIN"
        email="admin@cermin.local"
        roleLabel="Administrator"
        hasImage={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu akun" }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("admin@cermin.local")).toBeInTheDocument();
    expect(within(menu).getByText("Admin CERMIN")).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /Unggah foto profil/i }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /Pengaturan/i }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /Keluar/i }),
    ).toBeInTheDocument();
  });

  it("navigates to pengaturan from menu", async () => {
    const user = userEvent.setup();
    render(
      <UserAccountMenu
        name="Admin"
        email="admin@cermin.local"
        roleLabel="Administrator"
        hasImage={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu akun" }));
    const menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: /Pengaturan/i }),
    );
    expect(push).toHaveBeenCalledWith("/dashboard/pengaturan");
  });

  it("calls signOut on Keluar", async () => {
    const user = userEvent.setup();
    render(
      <UserAccountMenu
        name="Admin"
        email="admin@cermin.local"
        roleLabel="Administrator"
        hasImage={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu akun" }));
    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByRole("menuitem", { name: /Keluar/i }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(replace).toHaveBeenCalledWith("/");
    });
  });
});
