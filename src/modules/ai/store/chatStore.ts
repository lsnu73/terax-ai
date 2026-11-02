import type { Chat, UIMessage } from "@ai-sdk/react";
import { runtimeToast as toast } from "@/modules/agents/lib/runtimeNotifications";
import { create } from "zustand";
import { t } from "@/modules/i18n";
import { getDefaultModelId, tryResolveModel, type ProviderId } from "../config";
import { useTodosStore } from "./todoStore";
import type { AgentUsage } from "../lib/agent";
import { EMPTY_PROVIDER_KEYS, type ProviderKeys } from "../lib/keyring";
import {
  deleteSessionData,
  deriveTitle,
  loadAll,
  loadMessages,
  newSessionId,
  saveActiveId,
  saveMessages,
  saveSessionsList,
  type SessionMeta,
} from "../lib/sessions";
import { pushRecentModel } from "../lib/modelPrefs";
import { persistDelay } from "../lib/persistSchedule";

export type Live = {
  getCwd: () => string | null;
  getTerminalContext: () => string | null;
  isActiveTerminalPrivate: () => boolean;
  injectIntoActivePty: (text: string) => boolean;
  getWorkspaceRoot: () => string | null;
  getActiveFile: () => string | null;
  openPreview: (url: string) => boolean;
  spawnManagedAgent: (
    prompt: string,
    sessionId: string,
  ) => { tabId: number; leafId: number } | null;
  readLeafBuffer: (leafId: number) => string | null;
};

export type AgentRunStatus =
  | "idle"
  | "thinking"
  | "streaming"
  | "awaiting-approval"
  | "error";

export type AgentMeta = {
  status: AgentRunStatus;
  step: string | null;
  approvalsPending: number;
  error: string | null;
  tokens: AgentUsage;
  lastInputTokens: number;
  lastCachedTokens: number;
  hitStepCap: boolean;
  compactionNotice: { droppedCount: number; at: number } | null;
};

const ZERO_USAGE: AgentUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
};

const IDLE_META: AgentMeta = {
  status: "idle",
  step: null,
  approvalsPending: 0,
  error: null,
  tokens: ZERO_USAGE,
  lastInputTokens: 0,
  lastCachedTokens: 0,
  hitStepCap: false,
  compactionNotice: null,
};

type ApprovalResponder = (approvalId: string, approved: boolean) => void;

type StoreState = {
  live: Live;
  setLive: (live: Live) => void;

  /**
   * 每次渲染由 AgentRunBridge 写入。让聊天 hook 树之外的界面
   * （例如编辑器区域里的 AI diff 标签页）能通过当前会话的
   * `addToolApprovalResponse` 处理待审批的工具调用。
   */
  approvalResponder: ApprovalResponder | null;
  setApprovalResponder: (fn: ApprovalResponder | null) => void;
  respondToApproval: (approvalId: string, approved: boolean) => void;

  apiKeys: ProviderKeys;
  setApiKeys: (keys: ProviderKeys) => void;
  setApiKey: (provider: ProviderId, key: string | null) => void;

  // 【导览 17】当前选中的模型。这里只存字符串 ID，不存任何厂商对象。
  // 初始值来自 JSON 配置的 defaults.modelId；下拉选择器见【导览 21】。
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;

  focusSignal: number;
  focusInput: () => void;

  agentMeta: AgentMeta;
  patchAgentMeta: (patch: Partial<AgentMeta>) => void;
  resetAgentMeta: () => void;

  // 会话
  sessionsHydrated: boolean;
  sessions: SessionMeta[];
  activeSessionId: string | null;
  hydrateSessions: () => Promise<void>;
  newSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  /** 持久化某个会话的消息，并更新其 updatedAt 与自动标题。 */
  persistMessages: (id: string, messages: UIMessage[]) => void;
};

const NOOP_LIVE: Live = {
  getCwd: () => null,
  getTerminalContext: () => null,
  isActiveTerminalPrivate: () => false,
  injectIntoActivePty: () => false,
  getWorkspaceRoot: () => null,
  getActiveFile: () => null,
  openPreview: () => false,
  spawnManagedAgent: () => null,
  readLeafBuffer: () => null,
};

const CHATS_LRU_CAP = 8;
export const chats = new Map<string, Chat<UIMessage>>();

export function touchChat(id: string, c: Chat<UIMessage>) {
  if (chats.has(id)) chats.delete(id);
  chats.set(id, c);
  while (chats.size > CHATS_LRU_CAP) {
    const oldest = chats.keys().next().value;
    if (!oldest || oldest === id) break;
    if (useChatStore.getState().activeSessionId === oldest) break;
    flushPersistEntry(oldest);
    void chats.get(oldest)?.stop();
    chats.delete(oldest);
  }
}
// 会话的初始消息：hydration 时填充，构建对应 Chat 时消费。
export const seedMessages = new Map<string, UIMessage[]>();

// 逐 token 的消息持久化是调度执行的，而不是每个 token 都防抖：见
// `persistSchedule.ts`。流式保存只是普通的原子替换；下方的 flush
// 函数（回合结束、切换、淘汰、关闭）才是持久化落盘。
const pendingPersist = new Map<
  string,
  { latest: UIMessage[]; timer: ReturnType<typeof setTimeout>; firstAt: number }
>();
const lastPersistedAt = new Map<string, number>();

function commitPersist(id: string, durable: boolean) {
  const entry = pendingPersist.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  pendingPersist.delete(id);
  lastPersistedAt.set(id, Date.now());
  void saveMessages(id, entry.latest, { durable });
}

function schedulePersist(id: string, messages: UIMessage[]) {
  const now = Date.now();
  const existing = pendingPersist.get(id);
  if (existing) clearTimeout(existing.timer);
  const firstAt = existing?.firstAt ?? now;
  const timer = setTimeout(
    () => commitPersist(id, false),
    persistDelay(now, firstAt, lastPersistedAt.get(id) ?? null),
  );
  pendingPersist.set(id, { latest: messages, timer, firstAt });
}

function flushPersistEntry(id: string) {
  commitPersist(id, true);
}

export function flushPersist(id?: string): void {
  if (id) {
    flushPersistEntry(id);
    return;
  }
  for (const key of Array.from(pendingPersist.keys())) flushPersistEntry(key);
}

export const useChatStore = create<StoreState>((set, get) => ({
  live: NOOP_LIVE,
  setLive: (live) => set({ live }),

  approvalResponder: null,
  setApprovalResponder: (fn) => set({ approvalResponder: fn }),
  respondToApproval: (approvalId, approved) => {
    const fn = get().approvalResponder;
    if (fn) fn(approvalId, approved);
  },

  apiKeys: { ...EMPTY_PROVIDER_KEYS },
  setApiKeys: (keys) => set({ apiKeys: keys }),
  setApiKey: (provider, key) => {
    set({ apiKeys: { ...get().apiKeys, [provider]: key } });
  },

  selectedModelId: getDefaultModelId(),
  setSelectedModelId: (id) => {
    set({ selectedModelId: id });
    void pushRecentModel(id);
  },

  focusSignal: 0,
  focusInput: () => set((s) => ({ focusSignal: s.focusSignal + 1 })),

  agentMeta: IDLE_META,
  patchAgentMeta: (patch) =>
    set((s) => ({ agentMeta: { ...s.agentMeta, ...patch } })),
  resetAgentMeta: () => set({ agentMeta: IDLE_META }),

  sessionsHydrated: false,
  sessions: [],
  activeSessionId: null,

  hydrateSessions: async () => {
    if (get().sessionsHydrated) return;
    const { sessions } = await loadAll();
    if (get().sessionsHydrated) return;

    // 如果上一次运行留下了最近的未命名 "New chat" 会话就复用它，
    // 没必要每次启动都堆一个空的占位会话；否则新建一个放到最前面。
    const reusable = sessions[0]?.title === "New chat" ? sessions[0] : null;
    let nextSessions: SessionMeta[];
    let freshId: string;
    if (reusable) {
      nextSessions = sessions;
      freshId = reusable.id;
    } else {
      freshId = newSessionId();
      const fresh: SessionMeta = {
        id: freshId,
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      nextSessions = [fresh, ...sessions];
      void saveSessionsList(nextSessions);
    }
    void saveActiveId(freshId);

    set({
      sessions: nextSessions,
      activeSessionId: freshId,
      sessionsHydrated: true,
    });
  },

  newSession: () => {
    const id = newSessionId();
    const meta: SessionMeta = {
      id,
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [meta, ...get().sessions];
    set({ sessions: next, activeSessionId: id, agentMeta: IDLE_META });
    void saveSessionsList(next);
    void saveActiveId(id);
    return id;
  },

  switchSession: (id) => {
    if (get().activeSessionId === id) return;
    if (!get().sessions.some((s) => s.id === id)) return;

    // 首次打开该会话时才用已持久化的消息播种聊天；
    // 之后再切换会复用已缓存的 Chat 实例。
    const flip = () => {
      set({ activeSessionId: id, agentMeta: IDLE_META });
      void saveActiveId(id);
    };
    if (chats.has(id) || seedMessages.has(id)) {
      flip();
      return;
    }
    void loadMessages(id)
      .then((m) => {
        if (m && m.length > 0 && !chats.has(id)) seedMessages.set(id, m);
        flip();
      })
      .catch((error) => {
        // 留在当前会话：以空内容打开这个会话，可能在稍后覆盖掉
        // 只是暂时读不到的完好文件。
        toast.error(t("ai.sessions.openFailed"), {
          id: `conversation-open:${id}`,
          description: String(error),
        });
      });
  },

  deleteSession: (id) => {
    const remaining = get().sessions.filter((s) => s.id !== id);
    chats.get(id)?.stop();
    chats.delete(id);
    seedMessages.delete(id);
    const pend = pendingPersist.get(id);
    if (pend) {
      clearTimeout(pend.timer);
      pendingPersist.delete(id);
    }
    lastPersistedAt.delete(id);
    void deleteSessionData(id);
    void useTodosStore.getState().clearSession(id);

    if (remaining.length === 0) {
      const fresh: SessionMeta = {
        id: newSessionId(),
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({ sessions: [fresh], activeSessionId: fresh.id });
      void saveSessionsList([fresh]);
      void saveActiveId(fresh.id);
      return;
    }

    const wasActive = get().activeSessionId === id;
    const nextActive = wasActive ? remaining[0].id : get().activeSessionId;
    set({ sessions: remaining, activeSessionId: nextActive });
    void saveSessionsList(remaining);
    if (wasActive) void saveActiveId(nextActive);
  },

  renameSession: (id, title) => {
    const next = get().sessions.map((s) =>
      s.id === id ? { ...s, title, updatedAt: Date.now() } : s,
    );
    set({ sessions: next });
    void saveSessionsList(next);
  },

  persistMessages: (id, messages) => {
    // 流式输出会逐 token 触发这里；真正的写盘由调度器执行。
    schedulePersist(id, messages);

    // 只有派生标题真正变化时才更新 zustand 的会话列表；
    // 否则每个 token 都会重写会话数组，触发重渲染和一次存储写入。
    const sessions = get().sessions;
    const meta = sessions.find((s) => s.id === id);
    if (!meta) return;
    const isUntitled = !meta.title || meta.title === "New chat";
    if (!isUntitled) return;
    const nextTitle = deriveTitle(messages);
    if (nextTitle === meta.title) return;
    const next = sessions.map((s) =>
      s.id === id ? { ...s, title: nextTitle, updatedAt: Date.now() } : s,
    );
    set({ sessions: next });
    void saveSessionsList(next);
  },
}));

export function getActiveProviderKey(): string | null {
  const { selectedModelId, apiKeys } = useChatStore.getState();
  const info = tryResolveModel(selectedModelId);
  if (!info) return null;
  return apiKeys[info.provider] ?? null;
}

/** 选择器当前选中的模型；配置尚未 hydrate 或所选模型已被删除时返回 null。 */
export function getSelectedModelInfo() {
  return tryResolveModel(useChatStore.getState().selectedModelId);
}

export function getChat(sessionId?: string): Chat<UIMessage> | undefined {
  if (sessionId) return chats.get(sessionId);
  const id = useChatStore.getState().activeSessionId;
  return id ? chats.get(id) : undefined;
}
