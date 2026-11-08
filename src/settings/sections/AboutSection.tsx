import { Button } from "@/components/ui/button";
import { useUpdater } from "@/modules/updater";
import {
  Copy01Icon,
  GithubIcon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "../components/SectionHeader";

const REPO_URL = "https://github.com/lsnu73/terax-ai";

type AppTrace = {
  id: string;
  kind: string;
  value: string;
  exists: boolean;
};

/** Order the machine traces are shown in. */
const TRACE_KINDS = [
  "install",
  "config",
  "data",
  "cache",
  "logs",
  "registry",
  "credentials",
] as const;

const PLATFORM_LABEL: Record<string, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
  freebsd: "FreeBSD",
};

export function AboutSection() {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [name, setName] = useState("Terax");
  const [build, setBuild] = useState("");
  const [traces, setTraces] = useState<AppTrace[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { status, check, install } = useUpdater();
  const checking = status.kind === "checking";
  const downloading = status.kind === "downloading";
  const available = status.kind === "available";
  const manualAvailable = status.kind === "manual-available";
  const ready = status.kind === "ready";
  // 下载进度显示在更新按钮内、文字右侧，不再单独占一行。
  const downloadPercent =
    downloading && status.contentLength
      ? Math.min(
          100,
          Math.round((status.downloaded / status.contentLength) * 100),
        )
      : null;
  const checkLabel =
    status.kind === "uptodate"
      ? t("settings.about.update.upToDate")
      : status.kind === "error"
        ? t("settings.about.update.checkFailed")
        : checking
          ? t("settings.about.update.checking")
          : downloading
            ? t("settings.about.update.downloading")
            : ready
              ? t("settings.about.update.restartToInstall")
              : available
                ? t("settings.about.update.installVersion", {
                    version: status.update.version,
                  })
                : manualAvailable
                  ? t("settings.about.update.updateToVersion", {
                      version: status.info.version,
                    })
                  : t("settings.about.update.checkForUpdates");
  const onUpdateClick = () => {
    if (available) void install();
    else if (manualAvailable) void openUrl(status.info.releaseUrl);
    else void check({ manual: true });
  };

  const loadTraces = useCallback(() => {
    void invoke<AppTrace[]>("app_traces")
      .then(setTraces)
      .catch(() => setTraces([]));
  }, []);

  useEffect(loadTraces, [loadTraces]);

  useEffect(() => {
    void getVersion().then(setVersion);
    void getName().then(setName);
    try {
      const p = platform();
      const a = arch();
      const platformLabel = PLATFORM_LABEL[p] ?? p;
      setBuild(`${platformLabel} · ${a}`);
    } catch {
      setBuild("");
    }
  }, []);

  const copyTrace = (key: string, value: string) => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      window.setTimeout(
        () => setCopied((current) => (current === key ? null : current)),
        1500,
      );
    });
  };

  const traceGroups = TRACE_KINDS.map((kind) => ({
    kind,
    items: (traces ?? []).filter((trace) => trace.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("settings.about.header.title")} description="" />

      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-5">
        <img src="/logo.png" alt="" className="size-12" draggable={false} />
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold tracking-tight">
            {name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {t("settings.about.tagline")}
          </span>
          <span className="mt-1 font-mono text-[11px] text-muted-foreground">
            v{version || "—"}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[12px]">
        <dt className="text-muted-foreground">{t("settings.about.build")}</dt>
        <dd className="font-mono text-[11.5px]">
          {build ? `${build} · v${version}` : `v${version}`}
        </dd>

        <dt className="text-muted-foreground">
          {t("settings.about.bundleId")}
        </dt>
        <dd className="font-mono text-[11.5px]">app.wang.terax</dd>

        <dt className="text-muted-foreground">{t("settings.about.license")}</dt>
        <dd>Apache 2.0</dd>

        <dt className="text-muted-foreground">
          {t("settings.about.sourceCode")}
        </dt>
        <dd data-setting-id="about.source">
          <button
            type="button"
            onClick={() => void openUrl(REPO_URL)}
            className="inline-flex items-center gap-1.5 rounded-md text-[12px] underline-offset-2 hover:text-foreground hover:underline"
          >
            <HugeiconsIcon icon={GithubIcon} size={12} strokeWidth={1.75} />
            lsnu73/terax-ai
          </button>
        </dd>
      </dl>

      <div data-setting-id="about.update" className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onUpdateClick}
            disabled={checking || downloading || ready}
          >
            {checkLabel}
            {downloadPercent !== null && (
              <span className="font-mono tabular-nums">{downloadPercent}%</span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openUrl(REPO_URL)}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={GithubIcon} size={12} strokeWidth={1.75} />
            {t("settings.about.viewOnGitHub")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void openUrl(`${REPO_URL}/issues/new`)}
          >
            {t("settings.about.reportIssue")}
          </Button>
        </div>
        {status.kind === "error" && (
          <p className="font-mono text-[10.5px] break-all text-destructive/80">
            {status.message}
          </p>
        )}
      </div>

      <div data-setting-id="about.traces" className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium">
              {t("settings.about.traces.title")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t("settings.about.traces.description")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1.5 px-2"
            onClick={loadTraces}
          >
            <HugeiconsIcon icon={Refresh01Icon} size={12} strokeWidth={1.75} />
            {t("settings.about.traces.refresh")}
          </Button>
        </div>
        {traceGroups.map((group) => (
          <div key={group.kind} className="flex flex-col gap-1">
            <span className="text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
              {t(`settings.about.traces.kinds.${group.kind}`, {
                defaultValue: group.kind,
              })}
            </span>
            <div className="flex flex-col gap-1">
              {group.items.map((trace) => {
                const key = `${trace.id}:${trace.value}`;
                return (
                  <div
                    key={key}
                    className="flex items-start gap-2 rounded-md border border-border/50 bg-card/50 px-2.5 py-1.5"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5 text-[11.5px] font-medium">
                        {t(`settings.about.traces.items.${trace.id}`, {
                          defaultValue: trace.id,
                        })}
                        {trace.exists ? null : (
                          <span className="rounded bg-muted px-1 py-px text-[9.5px] font-normal text-muted-foreground">
                            {t("settings.about.traces.missing")}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 font-mono text-[10.5px] break-all text-muted-foreground select-text">
                        {trace.value}
                      </span>
                    </div>
                    <button
                      type="button"
                      title={t("settings.about.traces.copy")}
                      aria-label={t("settings.about.traces.copy")}
                      onClick={() => copyTrace(key, trace.value)}
                      className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={copied === key ? Tick02Icon : Copy01Icon}
                        size={12}
                        strokeWidth={1.75}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
