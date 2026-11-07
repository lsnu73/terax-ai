import type { ExplorerPathDropTarget } from "@/modules/explorer/lib/useExplorerDnd";
import { useAiAttachmentDropStore } from "../store/aiAttachmentDropStore";
import { prefillAiPanel } from "./aiPanel";

/** 标记 AI 面板中允许接收文件投放的区域。 */
export const AI_ATTACH_DROP_ATTR = "data-ai-attach-drop";

type AiAttachmentDropDeps = {
  /** 该屏幕坐标是否落在 AI 面板内。 */
  hitTest: (clientX: number, clientY: number) => boolean;
  /** 投放时把文件路径交给输入区。 */
  attach: (paths: string[]) => void;
  /** 更新面板高亮状态。 */
  setTarget: (target: boolean) => void;
};

/**
 * 把资源管理器的指针拖拽（`useExplorerDnd`）接到 AI 面板上。
 * 与终端投放共用同一份 drop target 契约，由 App 组合成一个链。
 */
export function createAiAttachmentDropTarget({
  hitTest,
  attach,
  setTarget,
}: AiAttachmentDropDeps): ExplorerPathDropTarget {
  return {
    updateTarget(clientX, clientY) {
      const inside = hitTest(clientX, clientY);
      setTarget(inside);
      return inside;
    },
    dropPath(paths, clientX, clientY) {
      setTarget(false);
      if (!hitTest(clientX, clientY)) return false;
      if (paths.length > 0) attach(paths);
      return true;
    },
    clearTarget() {
      setTarget(false);
    },
  };
}

function inAiPanel(clientX: number, clientY: number): boolean {
  const el = document.elementFromPoint(clientX, clientY);
  return el?.closest(`[${AI_ATTACH_DROP_ATTR}]`) != null;
}

/** 静态单例：内部拖拽是全局指针监听，不需要按组件订阅。 */
export const aiAttachmentDropTarget = createAiAttachmentDropTarget({
  hitTest: inAiPanel,
  attach: (paths) => prefillAiPanel({ attachmentPaths: paths }),
  setTarget: (target) => useAiAttachmentDropStore.getState().setTarget(target),
});
