import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { BlockContextMenu } from "@/modules/terminal/block/BlockContextMenu";
import type { PositionedBlock } from "@/modules/terminal/block/lib/blockTypes";
import type { TerminalSearchController } from "@/modules/terminal/search/TerminalSearchController";
import { GhosttyBlockSearchController } from "@/modules/terminal/ghostty/search/GhosttyBlockSearchController";
import { toast } from "sonner";
import { submitToLeaf } from "@/modules/terminal/lib/terminalSessionApi";
import { useTheme } from "@/modules/theme";
import {
  forwardRef,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import type { TerminalBackendKind } from "./backend/contracts";
import { resolvedTerminalBackend } from "./backend/selection";
import {
  useGhosttyTerminalSession,
  ghosttyBlockGeometry,
} from "./ghostty/useGhosttyTerminalSession";
import { ghosttyBlocks } from "./ghostty/ghosttyBlockSessions";

export type TerminalPaneHandle = {
  write: (data: string) => void;
  focus: () => void;
  getBuffer: (maxLines?: number) => string | null;
  getSelection: () => string | null;
};

export type TerminalPaneProps = {
  /** Stable identifier for this leaf (passed back through callbacks). */
  leafId: number;
  /** Tab containing this pane is on screen. */
  visible: boolean;
  /** This leaf is the active pane within its tab and receives auto-focus. */
  focused?: boolean;
  initialCwd?: string;
  onSearchReady?: (leafId: number, addon: TerminalSearchController) => void;
  onBlockSearch?: (leafId: number, addon: TerminalSearchController) => void;
  onBlockSearchClose?: (leafId: number) => void;
  onExit?: (leafId: number, code: number) => void;
  onCwd?: (leafId: number, cwd: string) => void;
  onOpenPreviewUrl?: (url: string) => void;
};

const TerminalAccessibleOutput = lazy(
  () => import("./ghostty/TerminalAccessibleOutput"),
);
const GhosttyBlockOverlay = lazy(() => import("./ghostty/GhosttyBlockOverlay"));

const GhosttyTerminalPane = memo(
  forwardRef<
    TerminalPaneHandle,
    TerminalPaneProps & {
      backend: Extract<TerminalBackendKind, `ghostty-${string}`>;
    }
  >(function GhosttyTerminalPane(
    {
      leafId,
      visible,
      focused = true,
      initialCwd,
      onSearchReady,
      onBlockSearch,
      onBlockSearchClose,
      onExit,
      onCwd,
      onOpenPreviewUrl,
      backend,
    },
    ref,
  ) {
    const screenReader = usePreferencesStore(
      (state) => state.terminalScreenReader,
    );
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const down = useRef<{ x: number; y: number } | null>(null);
    const [contextBlock, setContextBlock] = useState<PositionedBlock | null>(
      null,
    );
    const [contextOpen, setContextOpen] = useState(false);
    const { resolvedMode, activeTheme } = useTheme();
    const session = useGhosttyTerminalSession({
      leafId,
      backend,
      container: containerRef,
      visible,
      focused,
      initialCwd,
      onSearchReady: (search) => onSearchReady?.(leafId, search),
      onExit: (code) => onExit?.(leafId, code),
      onCwd: (cwd) => onCwd?.(leafId, cwd),
      onOpenPreviewUrl,
    });

    useEffect(() => {
      void resolvedMode;
      void activeTheme;
      const id = requestAnimationFrame(() => session.applyTheme());
      return () => cancelAnimationFrame(id);
    }, [resolvedMode, activeTheme, session]);

    useImperativeHandle(
      ref,
      () => ({
        write: session.write,
        focus: session.focus,
        getBuffer: session.getBuffer,
        getSelection: session.getSelection,
      }),
      [session],
    );

    const closeBlockSearch = useCallback(
      () => onBlockSearchClose?.(leafId),
      [leafId, onBlockSearchClose],
    );

    const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
      const state = ghosttyBlocks(leafId);
      const geometry = ghosttyBlockGeometry(leafId);
      const selection = session.getSelection();
      let block = null;
      if (
        !selection?.trim() &&
        state?.model &&
        geometry &&
        geometry.height > 0
      ) {
        const row = Math.floor(
          (event.clientY - geometry.top) / geometry.height,
        );
        if (row >= 0 && row < state.model.rows) {
          block = state.controller?.blockAtLine(
            state.model.bufferLineAtViewportRow(row),
            geometry.height,
          );
        }
      }
      if (!block) {
        event.preventDefault();
        event.stopPropagation();
        setContextOpen(false);
        setContextBlock(null);
        return;
      }
      setContextBlock(block);
    };

    return (
      <ContextMenu
        open={contextOpen && contextBlock !== null}
        onOpenChange={(open) => {
          setContextOpen(open);
          if (!open) setContextBlock(null);
        }}
      >
        <ContextMenuTrigger asChild>
          <div
            className="zoom-exempt relative h-full w-full overflow-hidden select-auto"
            style={{
              visibility: visible ? "visible" : "hidden",
              pointerEvents: visible ? "auto" : "none",
            }}
            onContextMenuCapture={onContextMenu}
            onPointerDownCapture={(event) => {
              // The terminal surface swallows pointer events, so Radix's
              // outside-dismissal never sees them; close the block menu here.
              if (contextOpen) {
                setContextOpen(false);
                setContextBlock(null);
              }
              down.current =
                event.button === 0 &&
                event.detail === 1 &&
                !event.shiftKey &&
                !event.altKey &&
                !event.metaKey &&
                !event.ctrlKey &&
                containerRef.current?.contains(event.target as Node)
                  ? { x: event.clientX, y: event.clientY }
                  : null;
            }}
            onPointerUp={(event) => {
              const origin = down.current;
              down.current = null;
              const state = ghosttyBlocks(leafId);
              const geometry = ghosttyBlockGeometry(leafId);
              if (
                origin &&
                geometry &&
                geometry.height > 0 &&
                Math.hypot(
                  event.clientX - origin.x,
                  event.clientY - origin.y,
                ) <= 4 &&
                !state?.model?.trackedSelection?.()
              ) {
                const row = Math.floor(
                  (event.clientY - geometry.top) / geometry.height,
                );
                if (state?.model && row >= 0 && row < state.model.rows)
                  state.controller?.selectAtLine(
                    state.model.bufferLineAtViewportRow(row),
                  );
              }
              session.focus();
            }}
            data-terminal-backend={backend}
          >
            <div ref={containerRef} className="absolute inset-0" />
            {screenReader && session.model && (
              <Suspense fallback={null}>
                <TerminalAccessibleOutput
                  model={session.model}
                  visible={visible}
                  focused={focused}
                  onExit={session.focus}
                />
              </Suspense>
            )}
            <Suspense fallback={null}>
              <GhosttyBlockOverlay
                leafId={leafId}
                onCloseSearch={closeBlockSearch}
              />
            </Suspense>
            {session.error && (
              <div
                role="alert"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center text-sm"
              >
                <strong>
                  {session.error.kind === "renderer"
                    ? t("terminal.pane.unableToDisplay")
                    : t("terminal.pane.unableToStart")}
                </strong>
                <p className="max-w-md break-words text-muted-foreground">
                  {session.error.message}
                </p>
                {session.error.kind === "renderer" && (
                  <p className="text-muted-foreground">
                    {t("terminal.pane.sessionPreserved")}
                  </p>
                )}
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 hover:bg-accent focus-visible:outline-2"
                  onClick={session.retry}
                >
                  {session.error.kind === "renderer"
                    ? t("terminal.pane.retryDisplay")
                    : t("terminal.pane.retry")}
                </button>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <BlockContextMenu
          block={contextBlock}
          readOutput={(id) =>
            ghosttyBlocks(leafId)?.controller?.readById(id)?.output ?? null
          }
          onRunAgain={(command) => submitToLeaf(leafId, command)}
          onSearch={(id) => {
            const blocks = ghosttyBlocks(leafId)?.controller;
            if (!blocks) return;
            blocks.clearSearch();
            onBlockSearch?.(
              leafId,
              new GhosttyBlockSearchController(blocks, id, () =>
                toast.error(t("terminal.block.searchFailed")),
              ),
            );
          }}
          onRestoreFocus={session.focus}
        />
      </ContextMenu>
    );
  }),
);

export const TerminalPane = memo(
  forwardRef<TerminalPaneHandle, TerminalPaneProps>(
    function TerminalPane(props, ref) {
      const [backend] = useState(() =>
        usePreferencesStore.getState().terminalRenderer === "webgl"
          ? ("ghostty-webgl" as const)
          : resolvedTerminalBackend(),
      );
      return <GhosttyTerminalPane ref={ref} {...props} backend={backend} />;
    },
  ),
);
