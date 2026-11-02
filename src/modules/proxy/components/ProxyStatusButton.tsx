import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setProxySettings } from "@/modules/settings/store";
import { Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { resolveProxyUrl } from "../lib/proxy";

/** 状态栏代理开关：与设置页「代理生效场景」共用同一份偏好。 */
export function ProxyStatusButton() {
  const { t } = useTranslation();
  const proxy = usePreferencesStore((s) => s.proxy);
  const init = usePreferencesStore((s) => s.init);
  const activeCount =
    Number(proxy.terminal) + Number(proxy.ai) + Number(proxy.updater);
  const configured = resolveProxyUrl(proxy) !== null;

  const scenarios = [
    { key: "terminal", label: t("settings.proxy.scenarios.terminal") },
    { key: "ai", label: t("settings.proxy.scenarios.ai") },
    { key: "updater", label: t("settings.proxy.scenarios.updater") },
  ] as const;

  return (
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
            <div
              key={key}
              className="flex items-center justify-between rounded-md px-2 py-1.5"
            >
              <span className="text-[12px]">{label}</span>
              <Switch
                checked={proxy[key]}
                onCheckedChange={(value) =>
                  void setProxySettings({ ...proxy, [key]: value })
                }
              />
            </div>
          ))}
          <div className="mt-1 flex justify-end gap-1.5 border-t border-border/60 pt-1.5">
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
