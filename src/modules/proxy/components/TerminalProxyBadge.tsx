import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { useSyncExternalStore } from "react";
import { resolveProxyUrl } from "../lib/proxy";
import {
  getLeafSpawnedProxyVersion,
  hasTerminalProxyDrift,
  subscribeLeafSpawnedProxy,
} from "../lib/terminalProxyRegistry";

/**
 * 状态栏左侧（隐私徽章旁）的终端代理徽章。
 * 终端代理开启且已打开终端无需刷新时显示；悬停说明终端命令与
 * AI 执行的命令都会走代理。待刷新状态由右下角「刷新终端生效」按钮提示。
 */
export function TerminalProxyBadge() {
  const { t } = useTranslation();
  const proxy = usePreferencesStore((s) => s.proxy);
  useSyncExternalStore(subscribeLeafSpawnedProxy, getLeafSpawnedProxyVersion);
  const terminalProxyUrl =
    proxy.terminal && resolveProxyUrl(proxy) !== null
      ? resolveProxyUrl(proxy)
      : null;
  const terminalStale = hasTerminalProxyDrift(terminalProxyUrl);
  if (terminalProxyUrl === null || terminalStale) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex shrink-0 cursor-default items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10.5px] font-medium text-green-700 dark:text-green-400">
          <HugeiconsIcon icon={Globe02Icon} size={11} strokeWidth={2} />
          <span>{t("statusbar.proxy.terminalBadge")}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-64 text-[11px] leading-relaxed"
      >
        {t("statusbar.proxy.terminalBadgeTooltip")}
      </TooltipContent>
    </Tooltip>
  );
}
