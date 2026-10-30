import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setPreviewPortPresets } from "@/modules/settings/store";
import {
  ArrowReloadHorizontalIcon,
  Globe02Icon,
  LinkSquare02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { PortPresetDialog } from "./PortPresetDialog";
import {
  upsertPreviewPortPreset,
  type PreviewPortPreset,
} from "./lib/portPresets";

export type PreviewAddressBarHandle = {
  focus: () => void;
  openPorts: () => void;
};

type Props = {
  url: string;
  onSubmit: (url: string) => void;
  onReload: () => void;
};

export const PreviewAddressBar = forwardRef<PreviewAddressBarHandle, Props>(
  function PreviewAddressBar({ url, onSubmit, onReload }, ref) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(url);
    const inputRef = useRef<HTMLInputElement>(null);
    const presets = usePreferencesStore((state) => state.previewPortPresets);
    const [portsOpen, setPortsOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPreset, setEditingPreset] =
      useState<PreviewPortPreset | null>(null);

    // Keep draft in sync when the parent updates the URL externally
    // (AI tool, detected localhost chip, etc.).
    useEffect(() => {
      setDraft(url);
    }, [url]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          const el = inputRef.current;
          if (!el) return;
          el.focus();
          el.select();
        },
        openPorts: () => setPortsOpen(true),
      }),
      [],
    );

    const [notice, setNotice] = useState<string | null>(null);
    const [checkingPort, setCheckingPort] = useState<number | null>(null);

    const submit = () => {
      const next = normalizeUrl(draft);
      if (!next) {
        setNotice(t("preview.noticeEnterUrl"));
        return;
      }
      setNotice(null);
      if (next !== url) onSubmit(next);
      else onReload();
    };

    const tryPort = async (port: number) => {
      setNotice(null);
      setCheckingPort(port);
      const url = `http://localhost:${port}`;
      const ok = await probeUrl(url);
      setCheckingPort(null);
      if (!ok) {
        setNotice(t("preview.noticeNoServer", { port }));
        return;
      }
      setDraft(url);
      onSubmit(url);
    };

    const openPortEditor = (preset: PreviewPortPreset | null) => {
      setPortsOpen(false);
      setEditingPreset(preset);
      setEditorOpen(true);
    };

    const savePortPreset = (preset: PreviewPortPreset) => {
      void setPreviewPortPresets(upsertPreviewPortPreset(presets, preset));
    };

    return (
      <div className="shrink-0 border-b border-border/60">
        <div className="flex h-9 items-center gap-1 bg-card/40 px-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onReload}
            title={t("preview.reload")}
            className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              size={14}
              strokeWidth={1.75}
            />
          </Button>
          <DropdownMenu open={portsOpen} onOpenChange={setPortsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title={t("preview.portsTitle")}
                className="h-7 shrink-0 gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={Globe02Icon}
                  size={13}
                  strokeWidth={1.75}
                />
                <span className="hidden sm:inline">{t("preview.ports")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 min-w-56 overflow-y-auto"
            >
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="group flex items-center rounded-2xl focus-within:bg-accent/40"
                >
                  <DropdownMenuItem
                    className="min-w-0 flex-1 rounded-r-none py-2"
                    title={preset.hint || undefined}
                    onSelect={(event) => {
                      event.preventDefault();
                      void tryPort(preset.port);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {preset.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {checkingPort === preset.port
                        ? t("preview.checking")
                        : `:${preset.port}`}
                    </span>
                  </DropdownMenuItem>
                  <button
                    type="button"
                    title={t("preview.portEdit")}
                    aria-label={t("preview.portEdit")}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => openPortEditor(preset)}
                    className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    <HugeiconsIcon
                      icon={PencilEdit02Icon}
                      size={12}
                      strokeWidth={1.75}
                    />
                  </button>
                </div>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openPortEditor(null)}>
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  size={13}
                  strokeWidth={2}
                />
                <span className="flex-1">{t("preview.portsAdd")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex min-w-0 flex-1 items-center">
            <Input
              ref={inputRef}
              value={draft}
              placeholder="http://localhost:3000"
              spellCheck={false}
              autoComplete="off"
              className="h-7 w-full bg-muted/60 px-2 text-xs placeholder:text-muted-foreground/70 focus-visible:ring-0"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setDraft(url);
                  inputRef.current?.blur();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (url) void openUrl(url).catch(console.error);
            }}
            title={t("preview.openInSystemBrowser")}
            className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            disabled={!url}
          >
            <HugeiconsIcon
              icon={LinkSquare02Icon}
              size={14}
              strokeWidth={1.75}
            />
          </Button>
        </div>
        {notice ? (
          <div className="flex items-center gap-1.5 bg-amber-500/8 px-3 py-1 text-[11px] text-amber-600 dark:text-amber-400">
            <span className="truncate">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="ml-auto rounded px-1 text-[10px] opacity-80 hover:bg-accent hover:opacity-100"
            >
              {t("preview.dismiss")}
            </button>
          </div>
        ) : null}
        <PortPresetDialog
          open={editorOpen}
          initial={editingPreset}
          presets={presets}
          onOpenChange={setEditorOpen}
          onSave={savePortPreset}
        />
      </div>
    );
  },
);

async function probeUrl(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(900),
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(:|\/|$)/i.test(trimmed)) return `http://${trimmed}`;
  if (/^\d{1,3}(\.\d{1,3}){3}(:|\/|$)/.test(trimmed))
    return `http://${trimmed}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
