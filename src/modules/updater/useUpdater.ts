import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { IS_LINUX } from "@/lib/platform";
import { runtimeToast } from "@/modules/agents/lib/runtimeNotifications";
import { t } from "@/modules/i18n";
import { proxyForScenario } from "@/modules/proxy/lib/proxy";
import { openSettings } from "@/modules/settings/openSettings";
import { usePreferencesStore } from "@/modules/settings/preferences";

const LAST_CHECK_KEY = "terax:updater:last-check";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const GITHUB_LATEST_RELEASE =
  "https://api.github.com/repos/lsnu73/terax-ai/releases/latest";

export interface ManualUpdateInfo {
  version: string;
  currentVersion: string;
  body: string;
  releaseUrl: string;
}

export type UpdaterStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; update: Update }
  | { kind: "manual-available"; info: ManualUpdateInfo }
  | { kind: "downloading"; downloaded: number; contentLength: number | null }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/** 发现新版本的检查来源：只有启动检查才发通知，手动检查只在设置页内展示。 */
export type UpdaterCheckSource = "startup" | "manual";

type UpdaterStore = {
  status: UpdaterStatus;
  source: UpdaterCheckSource | null;
  check: (options?: { manual?: boolean }) => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
};

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split("-")[0]
    .split(".")
    .map((p) => Number.parseInt(p, 10) || 0);
}

function isNewer(remote: string, current: string): boolean {
  const a = parseVersion(remote);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

async function checkLinuxRelease(
  proxy: string | null,
): Promise<ManualUpdateInfo | null> {
  const [current, text] = await Promise.all([
    getVersion(),
    // 浏览器 fetch 无法设置代理，改走原生 reqwest（同时遵循更新场景开关）。
    invoke<string>("net_http_get", { url: GITHUB_LATEST_RELEASE, proxy }),
  ]);
  const data = JSON.parse(text) as {
    tag_name: string;
    body?: string;
    html_url: string;
  };
  const remote = data.tag_name.replace(/^v/, "");
  if (!isNewer(remote, current)) return null;
  return {
    version: remote,
    currentVersion: current,
    body: data.body ?? "",
    releaseUrl: data.html_url,
  };
}

/**
 * 更新状态机放在全局 store：启动自动检查发现的新版本要能被「关于」页直接
 * 复用，否则从通知跳过去后还得再点一次「检查更新」。
 */
export const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  status: { kind: "idle" },
  source: null,

  check: async ({ manual = false } = {}) => {
    if (!manual) {
      const last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
      if (Date.now() - last < CHECK_INTERVAL_MS) return;
    }
    const source: UpdaterCheckSource = manual ? "manual" : "startup";
    set({ status: { kind: "checking" }, source: null });
    const proxy = proxyForScenario(usePreferencesStore.getState(), "updater");
    try {
      if (IS_LINUX) {
        const info = await checkLinuxRelease(proxy);
        if (info) {
          set({ status: { kind: "manual-available", info }, source });
        } else {
          localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
          set({ status: { kind: "uptodate" }, source: null });
        }
        return;
      }
      // proxy 随 Update 对象保留，下载阶段继续生效。
      const update = await check({ proxy: proxy ?? undefined });
      if (update) {
        set({ status: { kind: "available", update }, source });
      } else {
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        set({ status: { kind: "uptodate" }, source: null });
      }
    } catch (err) {
      set({ status: { kind: "error", message: String(err) }, source: null });
    }
  },

  install: async () => {
    const { status } = get();
    if (status.kind !== "available") return;
    const { update } = status;
    let total: number | null = null;
    let downloaded = 0;
    set({ status: { kind: "downloading", downloaded: 0, contentLength: null } });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
          set({
            status: {
              kind: "downloading",
              downloaded: 0,
              contentLength: total,
            },
          });
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          set({
            status: { kind: "downloading", downloaded, contentLength: total },
          });
        } else if (event.event === "Finished") {
          set({ status: { kind: "ready" } });
        }
      });
      await relaunch();
    } catch (err) {
      set({ status: { kind: "error", message: String(err) }, source: null });
    }
  },

  dismiss: () => set({ status: { kind: "idle" }, source: null }),
}));

export function useUpdater() {
  return useUpdaterStore();
}

/**
 * 启动时自动检查更新（受「启动时自动检查更新」开关控制）。
 * 发现新版本只发一条消息，消息里的按钮跳到 设置 → 关于；不再弹更新窗口。
 */
export function useStartupUpdateCheck(enabled: boolean): void {
  const hydrated = usePreferencesStore((s) => s.hydrated);
  const autoCheck = usePreferencesStore((s) => s.autoCheckUpdates);
  // 只订阅版本号这个原始值：下载进度等状态变化不会让整个 App 重渲染。
  const availableVersion = useUpdaterStore((s) =>
    s.status.kind === "available"
      ? s.status.update.version
      : s.status.kind === "manual-available"
        ? s.status.info.version
        : null,
  );
  const source = useUpdaterStore((s) => s.source);
  const notifiedVersion = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !hydrated || !autoCheck) return;
    void useUpdaterStore.getState().check();
  }, [enabled, hydrated, autoCheck]);

  useEffect(() => {
    if (!enabled || !autoCheck || source !== "startup") return;
    if (!availableVersion || notifiedVersion.current === availableVersion) {
      return;
    }
    notifiedVersion.current = availableVersion;
    runtimeToast.info(
      t("updater.availableNotification", { version: availableVersion }),
      {
        id: `updater:${availableVersion}`,
        description: t("updater.availableNotificationBody"),
        action: {
          label: t("updater.openAbout"),
          onClick: () => openSettings("about"),
        },
      },
    );
  }, [autoCheck, availableVersion, enabled, source]);
}
