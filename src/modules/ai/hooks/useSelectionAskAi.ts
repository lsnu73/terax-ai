import { isTerminalSurfaceTarget } from "@/modules/terminal/lib/terminalSurfaceTarget";
import { useCallback, useEffect, useState } from "react";

type Params = {
  captureActiveSelection: () => string | null;
  askFromSelection: () => void;
};

/**
 * Tracks text selections inside the terminal / editor and surfaces the
 * "Ask AI" popup at the pointer. Dismisses on any click outside the AI surface.
 */
export function useSelectionAskAi({
  captureActiveSelection,
  askFromSelection,
}: Params) {
  const [askPopup, setAskPopup] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    const isInsideAi = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return Boolean(el.closest("[data-selection-ask-ai]"));
    };

    // 终端选区控制器在 pointerdown/pointerup 上 preventDefault +
    // stopPropagation，兼容的 mousedown/mouseup 被抑制，冒泡阶段的
    // document 监听收不到终端内的点击。改用捕获阶段的 pointerdown：
    // 它先于目标元素的 stopPropagation 执行，任何点击都能关闭弹层。
    const onDown = (e: PointerEvent) => {
      if (isInsideAi(e.target)) return;
      setAskPopup(null);
    };
    const onUp = (e: MouseEvent) => {
      if (isInsideAi(e.target)) return;
      const el = e.target as HTMLElement | null;
      const inContentArea =
        isTerminalSurfaceTarget(e.target) || el?.closest?.(".cm-editor");
      if (!inContentArea) return;
      // Defer one tick so the terminal and CodeMirror finalize the selection.
      setTimeout(() => {
        const text = captureActiveSelection();
        if (text && text.trim().length > 0) {
          setAskPopup({ x: e.clientX, y: e.clientY });
        } else {
          setAskPopup(null);
        }
      }, 0);
    };

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("mouseup", onUp);
    };
  }, [captureActiveSelection]);

  const onAskFromSelection = useCallback(() => {
    askFromSelection();
    setAskPopup(null);
  }, [askFromSelection]);

  return { askPopup, setAskPopup, onAskFromSelection };
}
