import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStore } from "../store/agentStore";
import { runtimeToast } from "./runtimeNotifications";

const preferences = vi.hoisted(() => ({
  notificationDisplayMode: "toast" as "toast" | "badge",
}));
const sonner = vi.hoisted(() => ({
  message: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/modules/settings/preferences", () => ({
  usePreferencesStore: { getState: () => preferences },
}));
vi.mock("sonner", () => ({ toast: sonner }));

beforeEach(() => {
  vi.clearAllMocks();
  preferences.notificationDisplayMode = "toast";
  useAgentStore.setState({ notifications: [] });
});

describe("runtimeToast", () => {
  it("shows a toast and retains the full message and action in history", () => {
    const action = vi.fn();
    const id = runtimeToast.error("Proxy launch failed", {
      id: "proxy-auto-launch",
      description: "os error 740",
      action: { label: "Retry", onClick: action },
    });

    expect(id).toBe("proxy-auto-launch");
    expect(sonner.error).toHaveBeenCalledWith(
      "Proxy launch failed",
      expect.objectContaining({ id, description: "os error 740" }),
    );
    expect(useAgentStore.getState().notifications[0]).toMatchObject({
      source: "runtime",
      runtimeId: id,
      kind: "error",
      title: "Proxy launch failed",
      body: "os error 740",
      read: false,
      action: { label: "Retry", onClick: action },
    });
  });

  it("only records an unread notification in badge mode", () => {
    preferences.notificationDisplayMode = "badge";
    runtimeToast.success("Copied");

    expect(sonner.success).not.toHaveBeenCalled();
    expect(useAgentStore.getState().notifications[0]).toMatchObject({
      kind: "success",
      title: "Copied",
      read: false,
    });
  });

  it("updates stable ids and dismisses through both paths only once", () => {
    const onDismiss = vi.fn();
    runtimeToast.warning("Save conflict", {
      id: "save-conflict",
      description: "The file changed",
      onDismiss,
    });
    const toastOptions = sonner.warning.mock.calls[0][1];
    runtimeToast.warning("Save conflict", {
      id: "save-conflict",
      description: "Read the latest version",
      onDismiss,
    });

    expect(useAgentStore.getState().notifications).toHaveLength(1);
    expect(useAgentStore.getState().notifications[0].body).toBe(
      "Read the latest version",
    );

    runtimeToast.dismiss("save-conflict");
    toastOptions?.onDismiss?.({} as never);

    expect(sonner.dismiss).toHaveBeenCalledWith("save-conflict");
    expect(useAgentStore.getState().notifications).toHaveLength(0);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
