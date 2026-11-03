import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureProxySoftwareRunning } from "./autoLaunch";

const invoke = vi.hoisted(() => vi.fn());
const runtimeToast = vi.hoisted(() => ({ error: vi.fn() }));
const preferences = vi.hoisted(() => ({
  proxy: {
    host: "localhost",
    port: "7890",
    terminal: true,
    ai: false,
    updater: false,
    appPath: "C:/Program Files/Nano/nano.exe",
    autoLaunch: true,
  },
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@/modules/agents/lib/runtimeNotifications", () => ({ runtimeToast }));
vi.mock("@/modules/settings/preferences", () => ({
  usePreferencesStore: { getState: () => preferences },
}));
vi.mock("@/modules/settings/store", () => ({
  onPreferencesChange: vi.fn(),
}));
vi.mock("@/modules/i18n", () => ({ t: (key: string) => key }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureProxySoftwareRunning", () => {
  it("surfaces the original launch error and releases the inflight guard", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    invoke.mockRejectedValueOnce(
      "failed to launch C:\\Program Files\\Nano\\nano.exe: os error 740",
    );

    await ensureProxySoftwareRunning();

    expect(runtimeToast.error).toHaveBeenCalledWith(
      "settings.proxy.software.autoLaunchFailed",
      {
        id: "proxy-auto-launch",
        description:
          "failed to launch C:\\Program Files\\Nano\\nano.exe: os error 740",
      },
    );
    expect(warning).toHaveBeenCalledOnce();

    invoke.mockResolvedValueOnce(false);
    await ensureProxySoftwareRunning();
    expect(invoke).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });
});
