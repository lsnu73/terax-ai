import { create } from "zustand";
import type { AiPanelPrefill } from "../lib/aiPanelBridge";

/**
 * 主窗口右侧 AI 面板的开关与预填状态。
 * 面板与聊天引擎同处一个 webview，不再需要跨窗口快照/命令桥。
 */
type AiPanelState = {
  open: boolean;
  /** 打开时待注入输入框的预填内容；由 AiPanel 消费后清除。 */
  prefill: AiPanelPrefill | null;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  prefillPanel: (payload: Omit<AiPanelPrefill, "at">) => void;
  clearPrefill: () => void;
};

export const useAiPanelStore = create<AiPanelState>((set, get) => ({
  open: false,
  prefill: null,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false, prefill: null }),
  togglePanel: () => set((s) => ({ open: !s.open, prefill: null })),
  prefillPanel: (payload) =>
    set({ open: true, prefill: { ...payload, at: Date.now() } }),
  clearPrefill: () => {
    if (get().prefill !== null) set({ prefill: null });
  },
}));
