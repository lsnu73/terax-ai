import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureTray, minimizeToTray } from "./appTray";

const { invoke, hide } = vi.hoisted(() => ({
  invoke: vi.fn(),
  hide: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ hide }),
}));
vi.mock("@/modules/i18n", () => ({
  t: (key: string) => key,
}));

beforeEach(() => {
  vi.resetAllMocks();
  invoke.mockResolvedValue(undefined);
  hide.mockResolvedValue(undefined);
});

describe("ensureTray", () => {
  it("creates the resident tray with localized menu labels", async () => {
    await ensureTray();

    expect(invoke).toHaveBeenCalledWith("tray_show", {
      openLabel: "app.tray.open",
      quitLabel: "app.tray.quit",
    });
    expect(hide).not.toHaveBeenCalled();
  });

  it("can be called again to reuse the existing tray", async () => {
    await ensureTray();
    await ensureTray();

    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

describe("minimizeToTray", () => {
  it("hides the window only after the tray is available", async () => {
    await expect(minimizeToTray()).resolves.toBe(true);

    expect(hide).toHaveBeenCalledOnce();
    expect(invoke.mock.invocationCallOrder[0]).toBeLessThan(
      hide.mock.invocationCallOrder[0],
    );
  });

  it("keeps the window visible when the tray cannot be created", async () => {
    invoke.mockRejectedValueOnce(new Error("unsupported"));

    await expect(minimizeToTray()).resolves.toBe(false);
    expect(hide).not.toHaveBeenCalled();
  });

  it("keeps the resident tray when hiding the window fails", async () => {
    hide.mockRejectedValueOnce(new Error("hide failed"));

    await expect(minimizeToTray()).resolves.toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("tray_show", {
      openLabel: "app.tray.open",
      quitLabel: "app.tray.quit",
    });
  });
});
