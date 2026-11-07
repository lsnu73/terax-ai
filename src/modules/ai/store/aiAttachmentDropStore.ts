import { create } from "zustand";

/**
 * 「把文件拖到 AI 面板」的瞬时状态：拖拽指针进入面板时为 true，
 * 面板据此显示投放高亮。指针离开、投放完成或拖拽取消时复位。
 */
type AiAttachmentDropState = {
  target: boolean;
  setTarget: (target: boolean) => void;
};

export const useAiAttachmentDropStore = create<AiAttachmentDropState>((set) => ({
  target: false,
  setTarget: (target) =>
    set((state) => (state.target === target ? state : { target })),
}));

/** 面板是否正处于文件投放高亮状态。 */
export function useAiAttachmentDropActive(): boolean {
  return useAiAttachmentDropStore((s) => s.target);
}
