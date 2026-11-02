import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  setProxySettings,
  type ProxySettings,
} from "@/modules/settings/store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";

/** 文本字段：本地草稿，blur/Enter 提交，避免每个按键都写盘。 */
function DraftInput({
  value,
  onCommit,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      value={draft ?? value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== value) onCommit(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function ProxySection() {
  const { t } = useTranslation();
  const proxy = usePreferencesStore((s) => s.proxy);

  const update = (patch: Partial<ProxySettings>) => {
    void setProxySettings({ ...proxy, ...patch });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("settings.proxy.header.title")}
        description={t("settings.proxy.header.description")}
      />

      <div className="flex flex-col gap-2">
        <Label>{t("settings.proxy.server.label")}</Label>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
          <DraftInput
            value={proxy.host}
            onCommit={(host) => update({ host })}
            placeholder={t("settings.proxy.server.hostPlaceholder")}
            ariaLabel={t("settings.proxy.server.host")}
            className="h-8 flex-1 font-mono text-[12px]"
          />
          <span className="text-muted-foreground">:</span>
          <DraftInput
            value={proxy.port}
            onCommit={(port) => update({ port })}
            placeholder={t("settings.proxy.server.portPlaceholder")}
            ariaLabel={t("settings.proxy.server.port")}
            className="h-8 w-24 font-mono text-[12px]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>{t("settings.proxy.scenarios.label")}</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => update({ terminal: true, ai: true, updater: true })}
            >
              {t("settings.proxy.scenarios.enableAll")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                update({ terminal: false, ai: false, updater: false })
              }
            >
              {t("settings.proxy.scenarios.disableAll")}
            </Button>
          </div>
        </div>
        <SettingRow
          title={t("settings.proxy.scenarios.terminal")}
          description={t("settings.proxy.scenarios.terminalDescription")}
        >
          <Switch
            checked={proxy.terminal}
            onCheckedChange={(terminal) => update({ terminal })}
          />
        </SettingRow>
        <SettingRow
          title={t("settings.proxy.scenarios.ai")}
          description={t("settings.proxy.scenarios.aiDescription")}
        >
          <Switch checked={proxy.ai} onCheckedChange={(ai) => update({ ai })} />
        </SettingRow>
        <SettingRow
          title={t("settings.proxy.scenarios.updater")}
          description={t("settings.proxy.scenarios.updaterDescription")}
        >
          <Switch
            checked={proxy.updater}
            onCheckedChange={(updater) => update({ updater })}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("settings.proxy.software.label")}</Label>
        <SettingRow title={t("settings.proxy.software.path")}>
          <DraftInput
            value={proxy.appPath}
            onCommit={(appPath) => update({ appPath })}
            placeholder={t("settings.proxy.software.pathPlaceholder")}
            ariaLabel={t("settings.proxy.software.path")}
            className="h-8 w-80 font-mono text-[12px]"
          />
        </SettingRow>
        <SettingRow
          title={t("settings.proxy.software.autoLaunch")}
          description={t("settings.proxy.software.autoLaunchDescription")}
        >
          <Switch
            checked={proxy.autoLaunch}
            onCheckedChange={(autoLaunch) => update({ autoLaunch })}
          />
        </SettingRow>
      </div>
    </div>
  );
}
