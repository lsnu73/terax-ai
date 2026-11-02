import { create } from "zustand";
import type {
  AgentNotification,
  AgentSession,
  AgentStatus,
  LocalAgentState,
  NewAgentNotification,
  RuntimeNotification,
} from "../lib/types";

const MAX_NOTIFICATIONS = 50;

let notifSeq = 0;

type AgentStoreState = {
  sessions: Record<number, AgentSession>;
  localAgent: LocalAgentState;
  notifications: AgentNotification[];
  start: (leafId: number, tabId: number, agent: string) => void;
  setStatus: (leafId: number, status: AgentStatus) => void;
  finish: (leafId: number) => void;
  setLocalAgent: (state: LocalAgentState) => void;
  pushNotification: (n: NewAgentNotification) => void;
  markAllRead: () => void;
  dismissNotification: (runtimeId: string | number) => void;
  clearNotifications: () => void;
};

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  sessions: {},
  localAgent: null,
  notifications: [],

  start: (leafId, tabId, agent) =>
    set((s) => {
      const now = Date.now();
      return {
        sessions: {
          ...s.sessions,
          [leafId]: {
            leafId,
            tabId,
            agent,
            status: "working",
            startedAt: now,
            lastActivityAt: now,
            attentionSince: null,
          },
        },
      };
    }),

  setStatus: (leafId, status) =>
    set((s) => {
      const prev = s.sessions[leafId];
      if (!prev || prev.status === status) return s;
      const now = Date.now();
      return {
        sessions: {
          ...s.sessions,
          [leafId]: {
            ...prev,
            status,
            lastActivityAt: now,
            attentionSince: status === "waiting" ? now : null,
          },
        },
      };
    }),

  finish: (leafId) =>
    set((s) => {
      if (!s.sessions[leafId]) return s;
      const next = { ...s.sessions };
      delete next[leafId];
      return { sessions: next };
    }),

  setLocalAgent: (state) =>
    set((s) => {
      const a = s.localAgent;
      if (a === state) return s;
      if (a && state && a.status === state.status && a.agent === state.agent) {
        return s;
      }
      return { localAgent: state };
    }),

  pushNotification: (n) =>
    set((s) => {
      const at = Date.now();
      if (n.source === "runtime") {
        const existing = s.notifications.find(
          (item): item is RuntimeNotification =>
            item.source === "runtime" && item.runtimeId === n.runtimeId,
        );
        if (existing) {
          return {
            notifications: [
              { ...existing, ...n, id: existing.id, at, read: false },
              ...s.notifications.filter((item) => item.id !== existing.id),
            ].slice(0, MAX_NOTIFICATIONS),
          };
        }
      }
      const notification: AgentNotification = {
        ...n,
        id: `n${++notifSeq}`,
        at,
        read: false,
      };
      return {
        notifications: [notification, ...s.notifications].slice(
          0,
          MAX_NOTIFICATIONS,
        ),
      };
    }),

  markAllRead: () =>
    set((s) => {
      if (!s.notifications.some((n) => !n.read)) return s;
      return {
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      };
    }),

  dismissNotification: (runtimeId) => {
    const notification = get().notifications.find(
      (n) => n.source === "runtime" && n.runtimeId === runtimeId,
    );
    if (!notification) return;
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== notification.id),
    }));
    notification.onDismiss?.();
  },

  clearNotifications: () => {
    const notifications = get().notifications;
    set({ notifications: [] });
    for (const n of notifications) {
      if (n.source === "runtime") n.onDismiss?.();
    }
  },
}));

/** The tab/leaf of the agent that most recently entered the waiting state, for
 *  the keyboard jump-to-attention shortcut. Null when none is waiting. */
export function nextAttentionTarget(): {
  tabId: number;
  leafId: number;
} | null {
  const waiting = Object.values(useAgentStore.getState().sessions)
    .filter((s) => s.status === "waiting")
    .sort((a, b) => (b.attentionSince ?? 0) - (a.attentionSince ?? 0));
  const t = waiting[0];
  return t ? { tabId: t.tabId, leafId: t.leafId } : null;
}
