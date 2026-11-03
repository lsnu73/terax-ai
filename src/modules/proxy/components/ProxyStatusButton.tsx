import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { openSettings } from "@/modules/settings/openSettings";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setProxySettings } from "@/modules/settings/store";
import {
  Globe02Icon,
  RefreshIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { useSyncExternalStore } from "react";
import { resolveProxyUrl } from "../lib/proxy";
import {
  getLeafSpawnedProxyVersion,
  hasTerminalProxyDrift,
  subscribeLeafSpawnedProxy,
} from "../lib/terminalProxyRegistry";

/** 状态栏代理开关：与设置页「代理生效场景」共用同一份偏好。 */
export function ProxyStatusButton() {
  const { t } = useTranslation();
  const proxy = usePreferencesStore((s) => s.proxy);
  const init = usePreferencesStore((s) => s.init);
  // 订阅终端代理快照登记表：终端创建/销毁/刷新时更新「待刷新」提示。
  useSyncExternalStore(subscribeLeafSpawnedProxy, getLeafSpawnedProxyVersion);
  const activeCount =
    Number(proxy.terminal) + Number(proxy.ai) + Number(proxy.updater);
  const configured = resolveProxyUrl(proxy) !== null;
  const terminalProxyUrl =
    proxy.terminal && configured ? resolveProxyUrl(proxy) : null;
  // 已打开终端创建时的代理与当前设置不一致，需要刷新终端才能生效。
  const terminalStale = hasTerminalProxyDrift(terminalProxyUrl);

  const refreshTerminals = async () => {
    // 按需加载终端会话模块，避免把 Ghostty 运行时带进状态栏启动图。
    const { restartAllSessions } = await import(
      "@/modules/terminal/lib/terminalSessionApi"
    );
    await restartAllSessions();
  };

  const scenarios = [
    { key: "terminal", label: t("settings.proxy.scenarios.terminal") },
    { key: "ai", label: t("settings.proxy.scenarios.ai") },
    { key: "updater", label: t("settings.proxy.scenarios.updater") },
  ] as const;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {terminalStale ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void refreshTerminals()}
              className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
            >
              <HugeiconsIcon icon={RefreshIcon} size={11} strokeWidth={1.75} />
              <span>{t("statusbar.proxy.terminalRefresh")}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-64 text-[11px] leading-relaxed"
          >
            {t("statusbar.proxy.terminalRefreshTooltip")}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <Popover onOpenChange={(open) => open && void init()}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={t("settings.tabs.proxy")}
            className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-accent hover:text-foreground ${
              activeCount > 0 && configured
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <HugeiconsIcon icon={Globe02Icon} size={12} strokeWidth={1.75} />
            {activeCount > 0 && configured ? (
              <span className="text-[10px]">{activeCount}</span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-56 p-2">
          <div className="flex flex-col gap-1">
            {scenarios.map(({ key, label }) => (
              <div key={key}>
                <div
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                    key === "terminal" && terminalStale ? "pb-0.5" : ""
                  }`}
                >
                  <span className="text-[12px]">{label}</span>
                  <Switch
                    checked={proxy[key]}
                    onCheckedChange={(value) =>
                      void setProxySettings({ ...proxy, [key]: value })
                    }
                  />
                </div>
                {key === "terminal" && terminalStale ? (
                  <p className="px-2 pb-1 pt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                    {t("settings.proxy.scenarios.terminalStaleHint")}
                  </p>
                ) : null}
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1.5">
              <button
                type="button"
                title={t("settings.tabs.proxy")}
                aria-label={t("settings.tabs.proxy")}
                onClick={() => openSettings("proxy")}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={13}
                  strokeWidth={1.75}
                />
              </button>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() =>
                    void setProxySettings({
                      ...proxy,
                      terminal: false,
                      ai: false,
                      updater: false,
                    })
                  }
                >
                  {t("settings.proxy.scenarios.disableAll")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={() =>
                    void setProxySettings({
                      ...proxy,
                      terminal: true,
                      ai: true,
                      updater: true,
                    })
                  }
                >
                  {t("settings.proxy.scenarios.enableAll")}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
