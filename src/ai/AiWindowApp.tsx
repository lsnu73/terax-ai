import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IS_MAC } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { AiChatView } from "@/modules/ai/components/AiChat";
import { AiWindowComposer } from "@/modules/ai/components/AiWindowComposer";
import { PlanDiffReview } from "@/modules/ai/components/PlanDiffReview";
import { TodoStrip } from "@/modules/ai/components/TodoStrip";
import { useAiBootstrap } from "@/modules/ai/hooks/useAiBootstrap";
import {
  AI_WINDOW_COMMAND_EVENT,
  AI_WINDOW_PREFILL_EVENT,
  AI_WINDOW_READY_EVENT,
  AI_WINDOW_SNAPSHOT_EVENT,
  type AiWindowCommand,
  type AiWindowPrefill,
  type AiWindowSnapshot,
} from "@/modules/ai/lib/aiWindowBridge";
import type { SessionMeta } from "@/modules/ai/lib/sessions";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { usePlanStore } from "@/modules/ai/store/planStore";
import { useTodosStore } from "@/modules/ai/store/todoStore";
import { useWorkspaceEnvStore } from "@/modules/workspace";
import {
  Add01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  Cancel01Icon,
  Delete02Icon,
  FilterIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const SUGGESTIONS = [
  {
    labelKey: "ai.miniWindow.suggestions.explainError.label",
    hintKey: "ai.miniWindow.suggestions.explainError.hint",
    textKey: "ai.miniWindow.suggestions.explainError.text",
    icon: AlertCircleIcon,
  },
  {
    labelKey: "ai.miniWindow.suggestions.generateCommand.label",
    hintKey: "ai.miniWindow.suggestions.generateCommand.hint",
    textKey: "ai.miniWindow.suggestions.generateCommand.text",
    icon: TerminalIcon,
  },
  {
    labelKey: "ai.miniWindow.suggestions.summarizeBuffer.label",
    hintKey: "ai.miniWindow.suggestions.summarizeBuffer.hint",
    textKey: "ai.miniWindow.suggestions.summarizeBuffer.text",
    icon: FilterIcon,
  },
] as const;

export function AiWindowApp() {
  useAiBootstrap({ mirror: true });
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<AiWindowSnapshot | null>(null);
  const [prefill, setPrefill] = useState<AiWindowPrefill | null>(null);
  const busy =
    snapshot?.status === "submitted" || snapshot?.status === "streaming";

  useEffect(() => {
    const unlisten = listen<AiWindowSnapshot>(
      AI_WINDOW_SNAPSHOT_EVENT,
      (event) => {
        const next = event.payload;
        setSnapshot(next);
        useChatStore.setState((state) => ({
          activeSessionId: next.sessionId,
          sessions: next.sessions,
          selectedModelId: next.selectedModelId,
          agentMeta: next.agentMeta,
          aiWindow: { open: true },
          live: {
            ...state.live,
            getWorkspaceRoot: () => next.workspaceRoot,
          },
        }));
        useWorkspaceEnvStore.setState({ env: next.workspaceEnv });
        usePlanStore.setState({
          active: next.planActive,
          queue: next.planQueue,
        });
        if (next.sessionId) {
          const sessionId = next.sessionId;
          useTodosStore.setState((state) => ({
            bySession: { ...state.bySession, [sessionId]: next.todos },
            hydrated: new Set(state.hydrated).add(sessionId),
          }));
        }
      },
    );
    const prefillListener = listen<AiWindowPrefill>(
      AI_WINDOW_PREFILL_EVENT,
      (event) => setPrefill(event.payload),
    );
    void emitTo("main", AI_WINDOW_READY_EVENT, {});
    return () => {
      void unlisten.then((fn) => fn());
      void prefillListener.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (
        mod &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "i"
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        invoke("close_ai_window").catch(console.error);
        return;
      }
      if (event.key === "F12") {
        event.preventDefault();
        invoke("open_devtools").catch(console.error);
        return;
      }
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      invoke("close_ai_window").catch(console.error);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const sendCommand = async (command: AiWindowCommand) => {
    await emitTo("main", AI_WINDOW_COMMAND_EVENT, command);
  };
  const close = () => {
    void invoke("close_ai_window").catch(console.error);
  };

  return (
    <TooltipProvider>
      <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <Header
          snapshot={snapshot}
          busy={busy}
          onClose={close}
          onSendCommand={sendCommand}
        />
        {snapshot?.planActive ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-muted/40 px-3 py-1.5 text-[11px]">
            <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
            <span className="font-medium">{t("ai.plan.modeLabel")}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {snapshot.planQueue.length > 0
                ? t("ai.plan.queued", { count: snapshot.planQueue.length })
                : t("ai.plan.noEditsQueued")}
            </span>
            <button
              type="button"
              onClick={() => void sendCommand({ type: "disable-plan" })}
              className="rounded px-1.5 py-0.5 text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("ai.plan.exit")}
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          {!snapshot ? (
            <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3" />
              {t("ai.miniWindow.loadingSessions")}
            </div>
          ) : snapshot.messages.length === 0 ? (
            <EmptyState
              onPick={(text) =>
                setPrefill((previous) => ({
                  at: (previous?.at ?? Date.now()) + 1,
                  text,
                }))
              }
            />
          ) : (
            <AiChatView
              messages={snapshot.messages}
              status={snapshot.status}
              error={snapshot.error ? new Error(snapshot.error) : undefined}
              clearError={() => void sendCommand({ type: "clear-error" })}
              addToolApprovalResponse={(argument) =>
                sendCommand({ type: "approval", ...argument })
              }
              stop={() => sendCommand({ type: "stop" })}
              onContinue={() => void sendCommand({ type: "continue" })}
            />
          )}
        </div>
        <TodoStrip sessionId={snapshot?.sessionId ?? null} />
        <AiWindowComposer
          prefill={prefill}
          onPrefillApplied={() => setPrefill(null)}
          onSend={(submission) => sendCommand({ type: "send", submission })}
          onStop={() => void sendCommand({ type: "stop" })}
          messages={snapshot?.messages ?? null}
          onSelectModel={(id) => void sendCommand({ type: "select-model", id })}
        />
        <PlanDiffReview
          onRemoveOne={(id) => void sendCommand({ type: "plan-remove", id })}
          onClear={() => void sendCommand({ type: "plan-clear" })}
          onApplyAll={async () => {
            await sendCommand({ type: "plan-apply" });
            return [];
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function Header({
  snapshot,
  busy,
  onClose,
  onSendCommand,
}: {
  snapshot: AiWindowSnapshot | null;
  busy: boolean;
  onClose: () => void;
  onSendCommand: (command: AiWindowCommand) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <header
      data-tauri-drag-region
      className="shrink-0 border-b border-border/60 bg-card/60 select-none"
    >
      <div
        data-tauri-drag-region
        className={cn(
          "flex h-10 items-center gap-2 pr-2",
          IS_MAC ? "pl-20" : "pl-3",
        )}
      >
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
          <img src="/logo.png" alt="" className="size-5 shrink-0" />
          <span className="text-[12px] font-semibold tracking-tight">
            Terax AI
          </span>
        </div>
        {snapshot ? (
          <SessionPicker snapshot={snapshot} onSendCommand={onSendCommand} />
        ) : null}
        <div className="flex-1" data-tauri-drag-region />
        {busy ? (
          <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Spinner className="size-2.5 shrink-0" />
            <span className="max-w-28 truncate">
              {snapshot?.agentMeta.step ?? t("ai.common.thinking")}
            </span>
          </span>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="size-6 shrink-0"
          aria-label={t("ai.common.close")}
          title={t("ai.miniWindow.closeEsc")}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  );
}

function SessionPicker({
  snapshot,
  onSendCommand,
}: {
  snapshot: AiWindowSnapshot;
  onSendCommand: (command: AiWindowCommand) => Promise<void>;
}) {
  const { t } = useTranslation();
  const active =
    snapshot.sessions.find((session) => session.id === snapshot.sessionId) ??
    null;
  if (!active) return null;
  const sorted = [...snapshot.sessions].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 max-w-44 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t("ai.miniWindow.switchSession")}
        >
          <span className="truncate">{sessionTitle(active, t)}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={10} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem
          onSelect={() => void onSendCommand({ type: "new-session" })}
          className="gap-2 text-xs"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          {t("ai.miniWindow.newSession")}
        </DropdownMenuItem>
        {sorted.length > 0 ? <DropdownMenuSeparator /> : null}
        {sorted.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            active={session.id === snapshot.sessionId}
            onSelect={() =>
              void onSendCommand({ type: "switch-session", id: session.id })
            }
            onDelete={() =>
              void onSendCommand({ type: "delete-session", id: session.id })
            }
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: SessionMeta;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-session-delete]")) {
          event.preventDefault();
          return;
        }
        onSelect();
      }}
      className={cn(
        "group flex items-center justify-between gap-2 text-xs",
        active && "bg-accent/40",
      )}
    >
      <span className="min-w-0 flex-1 truncate">
        {sessionTitle(session, t)}
      </span>
      <button
        type="button"
        data-session-delete
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        title={t("ai.miniWindow.deleteSession")}
        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        <HugeiconsIcon icon={Delete02Icon} size={11} strokeWidth={1.75} />
      </button>
    </DropdownMenuItem>
  );
}

function sessionTitle(
  session: SessionMeta,
  t: (key: string) => string,
): string {
  return !session.title || session.title === "New chat"
    ? t("ai.sessions.newChat")
    : session.title;
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-8 py-8 text-center">
      <img
        src="/logo.png"
        alt="Terax"
        className="size-12 shrink-0 opacity-90"
      />
      <div className="space-y-1.5">
        <p className="text-[14px] font-semibold tracking-tight">
          {t("ai.miniWindow.emptyTitle")}
        </p>
        <p className="max-w-72 text-[11.5px] leading-relaxed text-muted-foreground">
          {t("ai.miniWindow.emptyBody")}
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.labelKey}
            type="button"
            onClick={() => onPick(t(suggestion.textKey))}
            className="group flex items-center gap-2.5 rounded-lg border border-border bg-card/70 px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground group-hover:bg-foreground/5 group-hover:text-foreground">
              <HugeiconsIcon
                icon={suggestion.icon}
                size={13}
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-foreground">
                {t(suggestion.labelKey)}
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                {t(suggestion.hintKey)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
