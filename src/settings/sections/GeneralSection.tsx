import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type OsNotificationResult,
  testAgentOsNotification,
} from "@/modules/agents/lib/notify";
import { currentLocale } from "@/modules/i18n";
import { usePreferencesStore } from "@/modules/settings/preferences";
import type {
  CloseAction,
  LanguagePref,
  NotificationDisplayMode,
  ThemePref,
} from "@/modules/settings/store";
import {
  setAgentNotificationSound,
  setAgentNotifications,
  setAutoCheckUpdates,
  setAutostart,
  setCloseAction,
  setConfirmCloseRunningTerminal,
  setDefaultWorkspaceEnv,
  setExplorerGitDecorations,
  setLanguage,
  setNotificationDisplayMode,
  setRestoreWindowState,
  setShowHidden,
  setTerminalCursorBlink,
  setTerminalCursorStyle,
  setTerminalFontFamily,
  setTerminalFontSize,
  setTerminalFontWeight,
  setTerminalLetterSpacing,
  setPathHistoryLimit,
  setTerminalScrollback,
  setTerminalShell,
  setTerminalRenderer,
  setTerminalScreenReader,
  setZoomLevel,
  TERMINAL_FONT_SIZES,
  TERMINAL_SCROLLBACK_PRESETS,
} from "@/modules/settings/store";
import { PATH_HISTORY_LIMIT_PRESETS } from "@/modules/terminal/lib/pathHistory";
import { useTheme } from "@/modules/theme";
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";

const APPEARANCE: {
  id: ThemePref;
  labelKey: string;
  icon: typeof ComputerIcon;
}[] = [
  {
    id: "system",
    labelKey: "settings.general.appearance.system",
    icon: ComputerIcon,
  },
  {
    id: "light",
    labelKey: "settings.general.appearance.light",
    icon: Sun03Icon,
  },
  {
    id: "dark",
    labelKey: "settings.general.appearance.dark",
    icon: Moon02Icon,
  },
];

const TERMINAL_FONT_WEIGHTS = [
  { value: "normal", labelKey: "settings.general.terminal.fontWeight.normal" },
  { value: "500", labelKey: "settings.general.terminal.fontWeight.medium" },
  { value: "600", labelKey: "settings.general.terminal.fontWeight.semiBold" },
  { value: "bold", labelKey: "settings.general.terminal.fontWeight.bold" },
] as const;
const TERMINAL_CURSOR_STYLES = [
  { value: "bar", labelKey: "settings.general.terminal.cursorStyle.bar" },
  { value: "block", labelKey: "settings.general.terminal.cursorStyle.block" },
  {
    value: "underline",
    labelKey: "settings.general.terminal.cursorStyle.underline",
  },
] as const;
const LETTER_SPACINGS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

type ShellInfo = { name: string; path: string; integrated: boolean };
const SHELL_AUTO = "auto";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.05;
const NOTIFICATION_TEST_DELAY_MS = 2_000;

type NotificationTestState =
  | OsNotificationResult
  | "idle"
  | "waiting"
  | "sending";

export function GeneralSection() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  const language = usePreferencesStore((s) => s.language);
  const autostart = usePreferencesStore((s) => s.autostart);
  const restoreWindowState = usePreferencesStore((s) => s.restoreWindowState);
  const autoCheckUpdates = usePreferencesStore((s) => s.autoCheckUpdates);
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const explorerGitDecorations = usePreferencesStore(
    (s) => s.explorerGitDecorations,
  );
  const pathHistoryLimit = usePreferencesStore((s) => s.pathHistoryLimit);
  const terminalRenderer = usePreferencesStore((s) => s.terminalRenderer);
  const terminalScreenReader = usePreferencesStore(
    (s) => s.terminalScreenReader,
  );
  const terminalCursorBlink = usePreferencesStore((s) => s.terminalCursorBlink);
  const terminalCursorStyle = usePreferencesStore((s) => s.terminalCursorStyle);
  const terminalFontFamily = usePreferencesStore((s) => s.terminalFontFamily);
  const terminalFontWeight = usePreferencesStore((s) => s.terminalFontWeight);
  const terminalShell = usePreferencesStore((s) => s.terminalShell);
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const [wslDistros, setWslDistros] = useState<{ name: string }[]>([]);
  const defaultWorkspaceEnv = usePreferencesStore((s) => s.defaultWorkspaceEnv);
  const terminalLetterSpacing = usePreferencesStore(
    (s) => s.terminalLetterSpacing,
  );
  const terminalFontSize = usePreferencesStore((s) => s.terminalFontSize);
  const terminalScrollback = usePreferencesStore((s) => s.terminalScrollback);
  const confirmCloseRunningTerminal = usePreferencesStore(
    (s) => s.confirmCloseRunningTerminal,
  );
  const closeAction = usePreferencesStore((s) => s.closeAction);
  const zoomLevel = usePreferencesStore((s) => s.zoomLevel);
  const agentNotifications = usePreferencesStore((s) => s.agentNotifications);
  const agentNotificationSound = usePreferencesStore(
    (s) => s.agentNotificationSound,
  );
  const notificationDisplayMode = usePreferencesStore(
    (s) => s.notificationDisplayMode,
  );
  const [notificationTest, setNotificationTest] =
    useState<NotificationTestState>("idle");
  const notificationTestPending =
    notificationTest === "waiting" || notificationTest === "sending";

  const testNotification = async () => {
    setNotificationTest("waiting");
    await new Promise((resolve) =>
      setTimeout(resolve, NOTIFICATION_TEST_DELAY_MS),
    );
    setNotificationTest("sending");
    setNotificationTest(await testAgentOsNotification(agentNotificationSound));
  };

  useEffect(() => {
    let alive = true;
    void isEnabled()
      .then((on) => {
        if (!alive) return;
        if (on !== usePreferencesStore.getState().autostart) {
          void setAutostart(on);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void invoke<ShellInfo[]>("pty_list_shells")
      .then(setShells)
      .catch(() => {});
    void invoke<{ name: string }[]>("wsl_list_distros")
      .then(setWslDistros)
      .catch(() => {});
  }, []);

  const onToggleAutostart = async (next: boolean) => {
    try {
      if (next) await enable();
      else await disable();
      await setAutostart(next);
    } catch (e) {
      console.error("autostart toggle failed", e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("settings.general.header.title")}
        description={t("settings.general.header.description")}
      />

      <div className="flex flex-col gap-2">
        <Label>{t("settings.general.appearance.label")}</Label>
        <div
          data-setting-id="general.appearance"
          className="grid grid-cols-3 gap-2"
        >
          {APPEARANCE.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMode(o.id)}
              className={cn(
                "group flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card transition-all",
                mode === o.id
                  ? "border-foreground/60 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <HugeiconsIcon icon={o.icon} size={18} strokeWidth={1.5} />
              <span className="text-[11.5px]">{t(o.labelKey)}</span>
            </button>
          ))}
        </div>
        <SettingRow
          searchId="general.language"
          title={t("settings.general.language.title")}
          description={t("settings.general.language.description")}
        >
          <Select
            value={language}
            onValueChange={(v) => void setLanguage(v as LanguagePref)}
          >
            <SelectTrigger className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system" className="text-[12px]">
                {t("settings.general.language.system")}
              </SelectItem>
              <SelectItem value="en" className="text-[12px]">
                {t("settings.general.language.en")}
              </SelectItem>
              <SelectItem value="zh" className="text-[12px]">
                {t("settings.general.language.zh")}
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <p className="text-[11px] text-muted-foreground">
          {t("settings.general.appearance.themesHintPre")}
          <strong className="font-medium text-foreground">
            {t("settings.general.appearance.themesHintTab")}
          </strong>
        </p>
      </div>

      <div data-setting-id="general.zoom" className="flex flex-col gap-2">
        <Label>{t("settings.general.zoom.label")}</Label>
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">
              {t("settings.general.zoom.uiLevel")}
            </span>
            <span className="tabular-nums text-[11px] text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
          <Slider
            value={[zoomLevel]}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            onValueChange={(v) => void setZoomLevel(v[0] ?? 1)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("settings.general.explorer.label")}</Label>
        <SettingRow
          searchId="general.explorer.showHidden"
          title={t("settings.general.explorer.showHidden.title")}
          description={t("settings.general.explorer.showHidden.description")}
        >
          <Switch
            checked={showHidden}
            onCheckedChange={(v) => void setShowHidden(v)}
          />
        </SettingRow>
        <SettingRow
          searchId="general.explorer.gitDecorations"
          title={t("settings.general.explorer.gitDecorations.title")}
          description={t(
            "settings.general.explorer.gitDecorations.description",
          )}
        >
          <Switch
            checked={explorerGitDecorations}
            onCheckedChange={(v) => void setExplorerGitDecorations(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("settings.general.terminal.label")}</Label>
        <SettingRow
          searchId="general.terminal.renderer"
          title={t("settings.general.terminal.renderer.title")}
          description={t("settings.general.terminal.renderer.description")}
        >
          <Select
            value={terminalRenderer}
            onValueChange={(value) =>
              void setTerminalRenderer(value === "webgl" ? "webgl" : "auto")
            }
          >
            <SelectTrigger className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                {t("settings.general.terminal.renderer.auto")}
              </SelectItem>
              <SelectItem value="webgl">WebGL</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.terminal.screenReader"
          title={t("settings.general.terminal.screenReader.title")}
          description={t("settings.general.terminal.screenReader.description")}
        >
          <Switch
            checked={terminalScreenReader}
            onCheckedChange={(value) => void setTerminalScreenReader(value)}
          />
        </SettingRow>
        <SettingRow
          searchId="general.terminal.cursorBlink"
          title={t("settings.general.terminal.cursorBlink.title")}
          description={t("settings.general.terminal.cursorBlink.description")}
        >
          <Switch
            checked={terminalCursorBlink}
            onCheckedChange={(v) => void setTerminalCursorBlink(v)}
          />
        </SettingRow>
        <SettingRow
          searchId="general.terminal.cursorStyle"
          title={t("settings.general.terminal.cursorStyle.title")}
          description={t("settings.general.terminal.cursorStyle.description")}
        >
          <Select
            value={terminalCursorStyle}
            onValueChange={(v) => void setTerminalCursorStyle(v)}
          >
            <SelectTrigger
              value={terminalCursorStyle}
              className="h-8 w-28 text-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_CURSOR_STYLES.map((style) => (
                <SelectItem
                  key={style.value}
                  value={style.value}
                  className="text-[12px]"
                >
                  {t(style.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <FontFamilyInput
          value={terminalFontFamily}
          onCommit={(v) => void setTerminalFontFamily(v)}
        />
        <SettingRow
          searchId="general.terminal.fontWeight"
          title={t("settings.general.terminal.fontWeight.title")}
          description={t("settings.general.terminal.fontWeight.description")}
        >
          <Select
            value={terminalFontWeight}
            onValueChange={(v) => void setTerminalFontWeight(v)}
          >
            <SelectTrigger
              value={terminalFontWeight}
              className="h-8 w-28 text-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_FONT_WEIGHTS.map((w) => (
                <SelectItem
                  key={w.value}
                  value={w.value}
                  className="text-[12px]"
                >
                  {t(w.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.terminal.shell"
          title={t("settings.general.terminal.shell.title")}
          description={
            shells.find((s) => s.path === terminalShell)?.integrated === false
              ? t("settings.general.terminal.shell.descriptionUnintegrated")
              : wslDistros.length > 0
                ? t("settings.general.terminal.shell.descriptionWsl")
                : t("settings.general.terminal.shell.descriptionDefault")
          }
        >
          <Select
            value={terminalShell || SHELL_AUTO}
            onValueChange={(v) =>
              void setTerminalShell(v === SHELL_AUTO ? "" : v)
            }
          >
            <SelectTrigger
              value={terminalShell || SHELL_AUTO}
              className="h-8 w-40 text-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SHELL_AUTO} className="text-[12px]">
                {t("settings.general.terminal.shell.auto")}
              </SelectItem>
              {shells.map((s) => (
                <SelectItem key={s.path} value={s.path} className="text-[12px]">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        {(wslDistros.length > 0 || defaultWorkspaceEnv !== "local") && (
          <SettingRow
            title={t("settings.general.terminal.workspaceEnv.title")}
            description={t(
              "settings.general.terminal.workspaceEnv.description",
            )}
          >
            <Select
              value={defaultWorkspaceEnv}
              onValueChange={(v) => void setDefaultWorkspaceEnv(v)}
            >
              <SelectTrigger
                value={defaultWorkspaceEnv}
                className="h-8 w-40 text-[12px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local" className="text-[12px]">
                  {t("settings.general.terminal.workspaceEnv.windows")}
                </SelectItem>
                {wslDistros.map((d) => (
                  <SelectItem
                    key={d.name}
                    value={`wsl:${d.name}`}
                    className="text-[12px]"
                  >
                    WSL: {d.name}
                  </SelectItem>
                ))}
                {defaultWorkspaceEnv.startsWith("wsl:") &&
                  !wslDistros.some(
                    (d) => `wsl:${d.name}` === defaultWorkspaceEnv,
                  ) && (
                    <SelectItem
                      value={defaultWorkspaceEnv}
                      className="text-[12px]"
                    >
                      {t("settings.general.terminal.workspaceEnv.unavailable", {
                        name: defaultWorkspaceEnv.slice("wsl:".length),
                      })}
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          </SettingRow>
        )}
        <SettingRow
          searchId="general.terminal.letterSpacing"
          title={t("settings.general.terminal.letterSpacing.title")}
          description={t("settings.general.terminal.letterSpacing.description")}
        >
          <Select
            value={String(terminalLetterSpacing)}
            onValueChange={(v) => void setTerminalLetterSpacing(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LETTER_SPACINGS.map((v) => (
                <SelectItem key={v} value={String(v)} className="text-[12px]">
                  {v > 0 ? `+${v}` : v} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.terminal.fontSize"
          title={t("settings.general.terminal.fontSize.title")}
          description={t("settings.general.terminal.fontSize.description")}
        >
          <Select
            value={String(terminalFontSize)}
            onValueChange={(v) => void setTerminalFontSize(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_FONT_SIZES.map((size) => (
                <SelectItem
                  key={size}
                  value={String(size)}
                  className="text-[12px]"
                >
                  {size} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.terminal.scrollback"
          title={t("settings.general.terminal.scrollback.title")}
          description={t("settings.general.terminal.scrollback.description")}
        >
          <Select
            value={String(terminalScrollback)}
            onValueChange={(v) => void setTerminalScrollback(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_SCROLLBACK_PRESETS.map((lines) => (
                <SelectItem
                  key={lines}
                  value={String(lines)}
                  className="text-[12px]"
                >
                  {t("settings.general.terminal.scrollback.lines", {
                    lines: lines.toLocaleString(currentLocale()),
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.terminal.pathHistory"
          title={t("settings.general.terminal.pathHistory.title")}
          description={t("settings.general.terminal.pathHistory.description")}
        >
          <Select
            value={String(pathHistoryLimit)}
            onValueChange={(v) => void setPathHistoryLimit(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATH_HISTORY_LIMIT_PRESETS.map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {t("settings.general.terminal.pathHistory.entries", {
                    count: limit,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.terminal.confirmClose"
          title={t("settings.general.terminal.confirmClose.title")}
          description={t("settings.general.terminal.confirmClose.description")}
        >
          <Switch
            checked={confirmCloseRunningTerminal}
            onCheckedChange={(v) => void setConfirmCloseRunningTerminal(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("settings.general.agents.label")}</Label>
        <SettingRow
          searchId="general.agents.displayMode"
          title={t("settings.general.agents.displayMode.title")}
          description={t("settings.general.agents.displayMode.description")}
        >
          <Select
            value={notificationDisplayMode}
            onValueChange={(value) =>
              void setNotificationDisplayMode(value as NotificationDisplayMode)
            }
          >
            <SelectTrigger className="h-8 w-40 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toast" className="text-[12px]">
                {t("settings.general.agents.displayMode.toast")}
              </SelectItem>
              <SelectItem value="badge" className="text-[12px]">
                {t("settings.general.agents.displayMode.badge")}
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          searchId="general.agents.notifications"
          title={t("settings.general.agents.notifications.title")}
          description={t("settings.general.agents.notifications.description")}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!agentNotifications || notificationTestPending}
              title={notificationTestTitle(t, notificationTest)}
              onClick={() => void testNotification()}
            >
              {notificationTestLabel(t, notificationTest)}
            </Button>
            <Switch
              checked={agentNotifications}
              disabled={notificationTestPending}
              onCheckedChange={(v) => {
                setNotificationTest("idle");
                void setAgentNotifications(v);
              }}
            />
          </div>
        </SettingRow>
        <SettingRow
          searchId="general.agents.sound"
          title={t("settings.general.agents.sound.title")}
          description={t("settings.general.agents.sound.description")}
        >
          <Switch
            checked={agentNotificationSound}
            disabled={!agentNotifications || notificationTestPending}
            onCheckedChange={(v) => void setAgentNotificationSound(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("settings.general.window.label")}</Label>
        <div className="flex flex-col gap-2">
          <SettingRow
            searchId="general.window.closeAction"
            title={t("settings.general.window.closeAction.title")}
            description={t("settings.general.window.closeAction.description")}
          >
            <Select
              value={closeAction}
              onValueChange={(value) =>
                void setCloseAction(value as CloseAction)
              }
            >
              <SelectTrigger className="h-8 w-44 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask">
                  {t("settings.general.window.closeAction.ask")}
                </SelectItem>
                <SelectItem value="tray">
                  {t("settings.general.window.closeAction.tray")}
                </SelectItem>
                <SelectItem value="quit">
                  {t("settings.general.window.closeAction.quit")}
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("settings.general.startup.label")}</Label>
        <div className="flex flex-col gap-2">
          <SettingRow
            searchId="general.startup.launchAtLogin"
            title={t("settings.general.startup.launchAtLogin.title")}
            description={t(
              "settings.general.startup.launchAtLogin.description",
            )}
          >
            <Switch
              checked={autostart}
              onCheckedChange={(v) => void onToggleAutostart(v)}
            />
          </SettingRow>
          <SettingRow
            searchId="general.startup.restoreWindow"
            title={t("settings.general.startup.restoreWindow.title")}
            description={t(
              "settings.general.startup.restoreWindow.description",
            )}
          >
            <Switch
              checked={restoreWindowState}
              onCheckedChange={(v) => void setRestoreWindowState(v)}
            />
          </SettingRow>
          <SettingRow
            searchId="general.startup.autoCheckUpdates"
            title={t("settings.general.startup.autoCheckUpdates.title")}
            description={t(
              "settings.general.startup.autoCheckUpdates.description",
            )}
          >
            <Switch
              checked={autoCheckUpdates}
              onCheckedChange={(v) => void setAutoCheckUpdates(v)}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}

type TFunction = (key: string) => string;

function notificationTestLabel(
  t: TFunction,
  status: NotificationTestState,
): string {
  switch (status) {
    case "waiting":
      return t("settings.general.agents.test.waiting");
    case "sending":
      return t("settings.general.agents.test.sending");
    case "requested":
      return t("settings.general.agents.test.requested");
    case "denied":
      return t("settings.general.agents.test.denied");
    case "failed":
      return t("settings.general.agents.test.failed");
    default:
      return t("settings.general.agents.test.idle");
  }
}

function notificationTestTitle(
  t: TFunction,
  status: NotificationTestState,
): string {
  switch (status) {
    case "waiting":
      return t("settings.general.agents.test.titleWaiting");
    case "requested":
      return t("settings.general.agents.test.titleRequested");
    case "denied":
      return t("settings.general.agents.test.titleDenied");
    case "failed":
      return t("settings.general.agents.test.titleFailed");
    default:
      return t("settings.general.agents.test.titleIdle");
  }
}

function FontFamilyInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Commit (and trim) only on blur/Enter so a trailing space can be typed
  // mid-edit, e.g. "JetBrains Mono ".
  const commit = () => {
    const next = draft.trim();
    if (next !== draft) setDraft(next);
    if (next !== value) onCommit(next);
  };

  return (
    <SettingRow
      searchId="general.terminal.fontFamily"
      title={t("settings.general.terminal.fontFamily.title")}
      description={t("settings.general.terminal.fontFamily.description")}
    >
      <input
        type="text"
        value={draft}
        placeholder={t("settings.general.terminal.fontFamily.placeholder")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground/40"
      />
    </SettingRow>
  );
}
