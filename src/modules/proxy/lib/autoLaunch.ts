import { runtimeToast } from "@/modules/agents/lib/runtimeNotifications";
import { t } from "@/modules/i18n";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { onPreferencesChange } from "@/modules/settings/store";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { resolveProxyUrl } from "./proxy";

let inflight = false;

/**
 * 已配置代理、至少一个场景启用、且用户打开「自动启动」时，
 * 若代理软件未运行则启动它。Rust 侧先按可执行文件名检测进程，幂等。
 */
export async function ensureProxySoftwareRunning(): Promise<void> {
  const proxy = usePreferencesStore.getState().proxy;
  if (!proxy.autoLaunch || inflight) return;
  const path = proxy.appPath.trim();
  if (!path) return;
  if (!proxy.terminal && !proxy.ai && !proxy.updater) return;
  if (!resolveProxyUrl(proxy)) return;
  inflight = true;
  try {
    await invoke("proxy_ensure_running", { path });
  } catch (error) {
    console.warn("[terax] proxy auto-launch failed:", error);
    runtimeToast.error(t("settings.proxy.software.autoLaunchFailed"), {
      id: "proxy-auto-launch",
      description: String(error),
    });
  } finally {
    inflight = false;
  }
}

/** 启动时与代理设置变更后各检查一次。 */
export function useProxyAutoLaunch(): void {
  const init = usePreferencesStore((s) => s.init);
  const hydrated = usePreferencesStore((s) => s.hydrated);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!hydrated) return;
    void ensureProxySoftwareRunning();
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void onPreferencesChange((key) => {
      if (key === "proxy") void ensureProxySoftwareRunning();
    }).then((u) => {
      if (disposed) u();
      else unlisten = u;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [hydrated]);
}
