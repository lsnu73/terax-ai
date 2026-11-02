import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditorPaneHandle } from "@/modules/editor";
import {
  shortcutHintLabel,
  useShortcutHint,
} from "@/modules/shortcuts";
import type { TerminalSearchController } from "@/modules/terminal/search/TerminalSearchController";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const TERM_DECORATIONS = {
  matchBackground: "#515c6a",
  activeMatchBackground: "#d18616",
  matchOverviewRuler: "#d18616",
  activeMatchColorOverviewRuler: "#d18616",
};

// 弹窗右缘与原固定搜索框右缘一致；顶边贴标题栏下沿（h-10），
// 即终端内容的上边框位置。
const POPUP_WIDTH = 320;
const TITLEBAR_HEIGHT = 40;

export type SearchTarget =
  | {
      kind: "terminal";
      addon: TerminalSearchController;
      focus: () => void;
      placeholder?: string;
      onClose?: () => void;
    }
  | { kind: "editor"; handle: EditorPaneHandle; focus: () => void }
  | {
      kind: "git-history";
      handle: {
        setQuery: (q: string, options?: { regex?: boolean }) => void;
        clearQuery: () => void;
      };
      focus: () => void;
    }
  | null;

export type SearchInlineHandle = { focus: () => void };

type Props = {
  target: SearchTarget;
  /** 保留旧签名；弹窗模式下顶栏始终只显示图标按钮。 */
  compact?: boolean;
};

export const SearchInline = forwardRef<SearchInlineHandle, Props>(
  function SearchInline({ target }, ref) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [regex, setRegex] = useState(false);
    const [left, setLeft] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingFocusRef = useRef(false);
    const setInputRef = useCallback((el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (!el || !pendingFocusRef.current) return;
      pendingFocusRef.current = false;
      el.focus();
    }, []);

    const shortcutText = useShortcutHint("search.focus");
    const baseLabel =
      target?.kind === "git-history"
        ? t("header.gitSearch")
        : target?.kind === "terminal" && target.placeholder
          ? target.placeholder
          : t("header.search");
    const tooltipTitle = shortcutHintLabel(baseLabel, shortcutText);

    const regexValid = useMemo(() => {
      if (!regex || !q) return true;
      try {
        new RegExp(q);
        return true;
      } catch {
        return false;
      }
    }, [regex, q]);

    const openPopup = useCallback(() => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setLeft(Math.max(8, Math.round(rect.right - POPUP_WIDTH)));
      }
      pendingFocusRef.current = true;
      setOpen(true);
    }, []);

    const clearTarget = useCallback(() => {
      if (!target) return;
      if (target.kind === "terminal") target.addon.clearDecorations();
      else target.handle.clearQuery();
    }, [target]);

    const restoreTargetFocus = useCallback(() => {
      if (!target) return;
      target.focus();
    }, [target]);

    const close = useCallback(() => {
      clearTarget();
      setQ("");
      setOpen(false);
      restoreTargetFocus();
      if (target?.kind === "terminal") target.onClose?.();
    }, [clearTarget, restoreTargetFocus, target]);

    const focus = useCallback(() => {
      if (open) {
        inputRef.current?.focus();
      } else {
        openPopup();
      }
    }, [open, openPopup]);

    useImperativeHandle(ref, () => ({ focus }), [focus]);

    // Target switched (terminal ↔ editor) or removed → drop highlights.
    useEffect(() => clearTarget, [clearTarget]);

    // 点击弹窗/按钮以外区域关闭。
    useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: PointerEvent) => {
        const node = event.target as Node;
        if (popupRef.current?.contains(node)) return;
        if (buttonRef.current?.contains(node)) return;
        close();
      };
      document.addEventListener("pointerdown", onPointerDown, true);
      return () =>
        document.removeEventListener("pointerdown", onPointerDown, true);
    }, [open, close]);

    const applyIncremental = (next: string, useRegex = regex) => {
      if (!target) return;
      if (useRegex && next) {
        try {
          new RegExp(next);
        } catch {
          if (target.kind === "terminal") target.addon.clearDecorations();
          return;
        }
      }
      if (target.kind === "terminal") {
        if (next) {
          target.addon.findNext(next, {
            incremental: true,
            decorations: TERM_DECORATIONS,
            regex: useRegex,
          });
        } else {
          target.addon.clearDecorations();
        }
      } else {
        target.handle.setQuery(next, { regex: useRegex });
      }
    };

    const findDirection = (forward: boolean) => {
      if (!target || !q || !regexValid) return;
      if (target.kind === "terminal") {
        const opts = { decorations: TERM_DECORATIONS, regex };
        if (forward) target.addon.findNext(q, opts);
        else target.addon.findPrevious(q, opts);
      } else if (target.kind === "editor") {
        if (forward) target.handle.findNext();
        else target.handle.findPrevious();
      }
      // git-history: the list filters live; Enter has no next/prev semantics.
    };

    const iconButton = (
      icon: typeof Search01Icon,
      title: string,
      onClick: () => void,
      active = false,
    ) => (
      <button
        key={title}
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        onClick={onClick}
        className={`flex size-5 shrink-0 items-center justify-center rounded ${
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <HugeiconsIcon icon={icon} size={12} strokeWidth={1.75} />
      </button>
    );

    return (
      <>
        <Button
          ref={buttonRef}
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => (open ? close() : openPopup())}
          title={tooltipTitle}
        >
          <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.75} />
        </Button>
        {open
          ? createPortal(
              <div
                ref={popupRef}
                className="fixed z-50 flex h-8 animate-in items-center gap-0.5 rounded-md border border-border/80 bg-popover px-1.5 shadow-lg fade-in-0 duration-100"
                style={{ left, top: TITLEBAR_HEIGHT, width: POPUP_WIDTH }}
              >
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={13}
                  strokeWidth={1.75}
                  className="mr-1 shrink-0 text-muted-foreground"
                />
                <Input
                  ref={setInputRef}
                  value={q}
                  placeholder={baseLabel}
                  className={`h-6 min-w-0 flex-1 border-0 bg-transparent px-1 text-[12px]! shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 ${
                    regexValid ? "" : "text-destructive"
                  }`}
                  onChange={(e) => {
                    const next = e.target.value;
                    setQ(next);
                    applyIncremental(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      findDirection(!e.shiftKey);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      close();
                    }
                  }}
                />
                <button
                  type="button"
                  title={t("header.regexSearch")}
                  aria-label={t("header.regexSearch")}
                  aria-pressed={regex}
                  onClick={() => {
                    const next = !regex;
                    setRegex(next);
                    applyIncremental(q, next);
                  }}
                  className={`flex h-5 shrink-0 items-center rounded px-1 font-mono text-[11px] ${
                    regex
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  .*
                </button>
                {iconButton(ArrowUp01Icon, t("header.previousMatch"), () =>
                  findDirection(false),
                )}
                {iconButton(ArrowDown01Icon, t("header.nextMatch"), () =>
                  findDirection(true),
                )}
                {iconButton(Cancel01Icon, t("header.closeSearch"), close)}
              </div>,
              document.body,
            )
          : null}
      </>
    );
  },
);
