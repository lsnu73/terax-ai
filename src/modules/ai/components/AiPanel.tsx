import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AiChatView } from "@/modules/ai/components/AiChat";
import { AiPanelComposer } from "@/modules/ai/components/AiPanelComposer";
import { PlanDiffReview } from "@/modules/ai/components/PlanDiffReview";
import { TodoStrip } from "@/modules/ai/components/TodoStrip";
import { resolveProxyUrl } from "@/modules/proxy/lib/proxy";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { getOrCreateChat } from "@/modules/ai/store/chatRuntime";
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
import { useChat, type UIMessage } from "@ai-sdk/react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  buildComposerMessage,
  type ComposerSubmission,
} from "../lib/composerMessage";
import type { SessionMeta } from "../lib/sessions";
import { useSnippetsStore } from "../store/snippetsStore";
import { useAiPanelStore } from "../store/aiPanelStore";
import { useChatStore } from "../store/chatStore";
import { usePlanStore } from "../store/planStore";

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

/**
 * 主窗口右侧的 AI 面板。与 AgentRunBridge 共享同一 Chat 实例，
 * 直接读写 chat/plan/todo stores —— 独立窗口时代的快照镜像与
 * 命令桥在这里都不再需要。
 */
export function AiPanel({ onClose }: { onClose: () => void }) {
  const sessionId = useChatStore((s) => s.activeSessionId);
  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
        <Spinner className="size-3" />
      </div>
    );
  }
  return <AiPanelSession sessionId={sessionId} onClose={onClose} />;
}

function AiPanelSession({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sessions = useChatStore((s) => s.sessions);
  const agentMeta = useChatStore((s) => s.agentMeta);
  const prefill = useAiPanelStore((s) => s.prefill);
  const clearPrefill = useAiPanelStore((s) => s.clearPrefill);
  const planActive = usePlanStore((s) => s.active);
  const planQueue = usePlanStore((s) => s.queue);

  const chat = useMemo(() => getOrCreateChat(sessionId), [sessionId]);
  const {
    status,
    messages,
    error,
    clearError,
    regenerate,
    addToolApprovalResponse,
  } = useChat<UIMessage>({ chat });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const sendSubmission = async (submission: ComposerSubmission) => {
    if (!chat) return;
    const message = buildComposerMessage(
      submission,
      useSnippetsStore.getState().snippets,
    );
    if (message.kind === "handled") return;
    useChatStore
      .getState()
      .patchAgentMeta({ hitStepCap: false, compactionNotice: null });
    void chat.sendMessage({
      role: "user",
      parts: message.parts,
    } as Parameters<typeof chat.sendMessage>[0]);
  };

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-card/60 px-3 select-none">
          <span className="text-[12px] font-semibold tracking-tight">
            Terax AI
          </span>
          <SessionPicker
            sessionId={sessionId}
            sessions={sessions}
            onNewSession={() => useChatStore.getState().newSession()}
            onSwitchSession={(id) => useChatStore.getState().switchSession(id)}
            onDeleteSession={(id) => useChatStore.getState().deleteSession(id)}
          />
          <div className="flex-1" />
          <ProxyHints />
          {busy ? (
            <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
              <Spinner className="size-2.5 shrink-0" />
              <span className="max-w-28 truncate">
                {agentMeta.step ?? t("ai.common.thinking")}
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
        </header>
        {planActive ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-muted/40 px-3 py-1.5 text-[11px]">
            <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
            <span className="font-medium">{t("ai.plan.modeLabel")}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {planQueue.length > 0
                ? t("ai.plan.queued", { count: planQueue.length })
                : t("ai.plan.noEditsQueued")}
            </span>
            <button
              type="button"
              onClick={() => usePlanStore.getState().disable()}
              className="rounded px-1.5 py-0.5 text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("ai.plan.exit")}
            </button>
          </div>
        ) : null}
        {/* 必须是 flex 列：Conversation 的 flex-1 只在 flex 父级下生效，
            否则消息列表高度随内容增长、从输入框下方穿过且无法滚动。 */}
        <div className="flex min-h-0 flex-1 flex-col">
          {!chat ? (
            <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3" />
              {t("ai.miniWindow.loadingSessions")}
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              onPick={(text) =>
                useAiPanelStore.getState().prefillPanel({ text })
              }
            />
          ) : (
            <AiChatView
              messages={messages}
              status={status}
              error={error ?? undefined}
              clearError={clearError}
              onRetry={() => void regenerate()}
              addToolApprovalResponse={(argument) =>
                void addToolApprovalResponse(argument)
              }
              stop={() => void chat.stop()}
              onContinue={() => {
                useChatStore.getState().patchAgentMeta({ hitStepCap: false });
                void chat.sendMessage({
                  text: "Continue from where you stopped. Don't recap, just keep going.",
                });
              }}
            />
          )}
        </div>
        <TodoStrip sessionId={sessionId} />
        <AiPanelComposer
          prefill={prefill}
          onPrefillApplied={clearPrefill}
          onSend={sendSubmission}
          onStop={() => void chat?.stop()}
          messages={chat ? messages : null}
          onSelectModel={(id) => useChatStore.getState().setSelectedModelId(id)}
        />
        <PlanDiffReview
          onRemoveOne={(id) => usePlanStore.getState().removeOne(id)}
          onClear={() => usePlanStore.getState().clear()}
          onApplyAll={async () => {
            await usePlanStore.getState().applyAll();
            return [];
          }}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 * 面板头部代理徽章：终端代理影响 AI 执行的命令，AI 会话代理影响模型请求。
 * 紧凑徽章（脉冲圆点 + 文案 + 下拉图标），点击展开只读弹层，只展示已开启
 * 代理的场景及生效后果（不提供开关，开关在状态栏/设置页），失焦自动关闭；
 * 两个代理都未开启（或未配置代理地址）时不显示。
 */
function ProxyHints() {
  const { t } = useTranslation();
  const proxy = usePreferencesStore((s) => s.proxy);
  const configured = resolveProxyUrl(proxy) !== null;
  if (!configured || (!proxy.terminal && !proxy.ai)) return null;
  const scenarios = [
    {
      key: "terminal",
      label: t("ai.proxy.terminalLabel"),
      effect: t("ai.proxy.terminalEffect"),
    },
    {
      key: "ai",
      label: t("ai.proxy.sessionLabel"),
      effect: t("ai.proxy.sessionEffect"),
    },
  ] as const;
  const enabled = scenarios.filter(({ key }) => proxy[key]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("ai.proxy.badge")}
          className="flex shrink-0 items-center gap-1 rounded-md bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-700 transition-colors hover:bg-green-500/25 dark:text-green-400"
        >
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-green-500" />
          <span>{t("ai.proxy.badge")}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={10} strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-56 p-2">
        <div className="flex flex-col gap-1">
          {enabled.map(({ key, label, effect }) => (
            <div key={key} className="rounded-md px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                <span className="text-[12px]">{label}</span>
              </div>
              <p className="mt-0.5 pl-3 text-[10px] leading-relaxed text-muted-foreground">
                {effect}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SessionPicker({
  sessionId,
  sessions,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
}: {
  sessionId: string | null;
  sessions: SessionMeta[];
  onNewSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}) {
  const { t } = useTranslation();
  const active = sessions.find((s) => s.id === sessionId) ?? null;
  if (!active) return null;
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
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
        <DropdownMenuItem onSelect={onNewSession} className="gap-2 text-xs">
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          {t("ai.miniWindow.newSession")}
        </DropdownMenuItem>
        {sorted.length > 0 ? <DropdownMenuSeparator /> : null}
        {sorted.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            active={session.id === sessionId}
            onSelect={() => onSwitchSession(session.id)}
            onDelete={() => onDeleteSession(session.id)}
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
