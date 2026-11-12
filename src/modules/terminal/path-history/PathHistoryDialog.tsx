import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { filterPathHistory } from "@/modules/terminal/lib/pathHistory";
import { useVisiblePathHistory } from "@/modules/terminal/lib/useVisiblePathHistory";
import { Clock01Icon, FolderOpenIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Switches the active terminal leaf to the picked path. */
  onPick: (path: string) => void;
  /** Set when there is no terminal to cd into; picks are disabled. */
  disabledReasonKey?: string | null;
};

/**
 * 终端目录历史（Ctrl+E）：列出最近离开过的工作目录，回车或点击后
 * 在当前终端执行 cd。打开时搜索框默认聚焦，右侧有搜索按钮。
 */
export function PathHistoryDialog({
  open,
  onOpenChange,
  onPick,
  disabledReasonKey,
}: Props) {
  const { t } = useTranslation();
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const history = useVisiblePathHistory(
    usePreferencesStore((s) => s.pathHistory),
    open,
  );
  const limit = usePreferencesStore((s) => s.pathHistoryLimit);

  const filtered = useMemo(
    () => (open ? filterPathHistory(history, term).slice(0, limit) : []),
    [open, history, term, limit],
  );

  useEffect(() => {
    if (!open) return;
    setTerm("");
    setIndex(0);
    const handle = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [open]);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const pick = (path: string) => {
    if (disabledReasonKey) return;
    onOpenChange(false);
    onPick(path);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = filtered[index];
      if (target) pick(target);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-1/3 w-[min(620px,calc(100vw-32px))] translate-y-0 gap-0 overflow-hidden rounded-4xl! p-0"
        showCloseButton={false}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("terminal.pathHistory.title")}</DialogTitle>
          <DialogDescription>{t("terminal.pathHistory.title")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col outline-none">
          <div className="flex items-center gap-1.5 p-2.5 pb-1.5">
            <span className="flex shrink-0 items-center gap-1.5 pl-1 text-[12px] font-medium text-muted-foreground">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={13}
                strokeWidth={1.75}
              />
              {t("terminal.pathHistory.title")}
            </span>
            <Input
              ref={inputRef}
              value={term}
              onKeyDown={onKeyDown}
              onChange={(e) => {
                setTerm(e.target.value);
                setIndex(0);
              }}
              placeholder={t("terminal.pathHistory.searchPlaceholder")}
              spellCheck={false}
              className="h-8 flex-1 font-mono text-[12px]"
            />
            <Button
              size="icon"
              variant="outline"
              className="size-8 shrink-0"
              title={t("terminal.pathHistory.searchButton")}
              onClick={() => inputRef.current?.focus()}
            >
              <HugeiconsIcon icon={Search01Icon} size={13} strokeWidth={2} />
            </Button>
          </div>
          <div
            ref={listRef}
            className="max-h-80 min-h-0 overflow-y-auto overscroll-contain p-1.5 pt-0.5"
          >
            {disabledReasonKey ? (
              <EmptyRow label={t(disabledReasonKey)} />
            ) : filtered.length === 0 ? (
              <EmptyRow label={t("terminal.pathHistory.empty")} />
            ) : (
              filtered.map((path, i) => (
                <button
                  key={path}
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => pick(path)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left",
                    i === index
                      ? "bg-accent text-foreground"
                      : "text-foreground/85",
                  )}
                >
                  <HugeiconsIcon
                    icon={FolderOpenIcon}
                    size={13}
                    strokeWidth={1.75}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
                    {path}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 text-[10.5px] text-muted-foreground/70">
            <span>{t("terminal.pathHistory.hintEnter")}</span>
            <span>{t("terminal.pathHistory.hintLimit", { limit })}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="px-3 py-8 text-center text-[12px] text-muted-foreground/70">
      {label}
    </div>
  );
}
