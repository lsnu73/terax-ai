import { useWindowMaximized } from "@/lib/maximizedChrome";
import { USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * 窗口左右边缘的「拖拽阀」。
 *
 * 无边框窗口的左右边框同时承担两个职责：调整窗口宽度与侧栏（左：资源
 * 管理器侧栏；右：AI 面板）的打开/关闭/拖动，拖动边框时意图有歧义。规则：
 *
 * - 非最大化：只有「阀」段（垂直居中的一小段边框）执行侧栏的打开、关闭、
 *   拖动；其余边框区域通过 `startResizeDragging` 交还给系统调整窗口大小
 *   （最外圈原生 resize 边框本来就在 tao 的 NCHITTEST 手里，不会进到网页）。
 * - 最大化：窗口不可调整大小，整条左右边框统一执行侧栏操作。
 *
 * 收起态拖阀「渐进展开」：面板库会把低于最小宽度的 resize 钳制回最小宽度，
 * 收起态拖动原本毫无反馈。因此在收起态拖动开始时暂时解除最小宽度钳制，
 * 拖动过程中面板宽度逐帧跟随拖动距离；松手时恢复钳制，拖动距离不足最小
 * 宽度则补齐到最小宽度。
 *
 * macOS 不渲染（保留原生窗口行为）。
 */

/** 边框感应区深度（CSS px），阀与窗口 resize 区域都在这条带内。 */
const EDGE_WIDTH = 16;
/** 非最大化时阀段的高度（垂直居中）。 */
const VALVE_HEIGHT = 96;
/** 超过该位移视为拖动而非点击（视觉 px）。 */
const DRAG_THRESHOLD = 4;

type Side = "left" | "right";

export type EdgeValveController = {
  /** 阀当前是否可拖动（AI 面板未配置模型时禁用）。 */
  enabled: () => boolean;
  /** 阀被禁用时按下阀的反馈（提示先配置模型）。 */
  onDisabledActivate?: () => void;
  /** 点击（未拖动）：打开/关闭相邻侧栏。 */
  toggle: () => void;
  /** 按光标位置应用宽度（布局 px）；低于最小宽度即收合。 */
  applyWidth: (px: number) => void;
  /** 收起态拖动开始：暂时解除面板最小宽度钳制，宽度才能逐像素跟随。 */
  beginDragOpen: () => void;
  /** 收起态拖动中：面板宽度跟随拖动距离（布局 px）。 */
  applyDragOpen: (px: number) => void;
  /**
   * 收起态拖动结束：恢复最小宽度钳制；`px` 非空时为拖动距离，不足最小
   * 宽度补齐到最小宽度。
   */
  endDragOpen: (px: number | null) => void;
};

type Props = {
  left: EdgeValveController;
  right: EdgeValveController;
  /** 左侧相邻面板（侧栏）当前是否收起；收起时左边缘额外提供窗口 resize。 */
  leftCollapsed: boolean;
  /** 右侧相邻面板（AI 面板）当前是否收起。 */
  rightCollapsed: boolean;
};

export function WindowEdgeValves({
  left,
  right,
  leftCollapsed,
  rightCollapsed,
}: Props) {
  const maximized = useWindowMaximized();
  if (!USE_CUSTOM_WINDOW_CONTROLS) return null;
  return (
    <>
      <EdgeStrip
        side="left"
        controller={left}
        maximized={maximized}
        resizeActive={leftCollapsed}
      />
      <EdgeStrip
        side="right"
        controller={right}
        maximized={maximized}
        resizeActive={rightCollapsed}
      />
    </>
  );
}

function EdgeStrip({
  side,
  controller,
  maximized,
  resizeActive,
}: {
  side: Side;
  controller: EdgeValveController;
  maximized: boolean;
  resizeActive: boolean;
}) {
  return (
    // pointer-events-none：未覆盖阀/resize 的部分必须让点击落回下层内容。
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 z-30 w-4",
        side === "left" ? "left-0" : "right-0",
      )}
      style={{ width: EDGE_WIDTH }}
    >
      {resizeActive && !maximized && (
        <div
          className="pointer-events-auto absolute inset-0 cursor-ew-resize"
          onPointerDown={(e) => beginWindowResize(e, side)}
        />
      )}
      <div
        className={cn(
          "group/valve pointer-events-auto absolute left-0 w-full cursor-col-resize",
          maximized ? "inset-y-0" : "top-1/2 -translate-y-1/2",
        )}
        style={maximized ? undefined : { height: VALVE_HEIGHT }}
        onPointerDown={(e) =>
          beginValveDrag(e, side, controller, resizeActive)
        }
      >
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover/valve:opacity-100" />
      </div>
    </div>
  );
}

/** 非阀的边框区域：交给系统做原生窗口 resize（模态拖拽，无 pointerup）。 */
function beginWindowResize(
  e: ReactPointerEvent<HTMLDivElement>,
  side: Side,
): void {
  e.preventDefault();
  void getCurrentWindow()
    .startResizeDragging(side === "left" ? "West" : "East")
    .catch((err) => console.error("startResizeDragging failed:", err));
}

function beginValveDrag(
  e: ReactPointerEvent<HTMLDivElement>,
  side: Side,
  controller: EdgeValveController,
  collapsedAtStart: boolean,
): void {
  if (!controller.enabled()) {
    controller.onDisabledActivate?.();
    return;
  }
  e.preventDefault();
  const el = e.currentTarget;
  el.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  // `main.zoom-content` 缩放了布局：光标的视觉位移要除回 zoom 才是面板 px。
  const zoom = readLayoutZoom();
  const rect = el.getBoundingClientRect();
  let moved = false;
  let lastPx = 0;
  if (collapsedAtStart) controller.beginDragOpen();
  const onMove = (ev: PointerEvent) => {
    if (Math.abs(ev.clientX - startX) > DRAG_THRESHOLD) moved = true;
    if (!moved) return;
    const raw =
      side === "left"
        ? (ev.clientX - rect.left) / zoom
        : (rect.right - ev.clientX) / zoom;
    lastPx = raw;
    if (collapsedAtStart) controller.applyDragOpen(raw);
    else controller.applyWidth(raw);
  };
  const onUp = () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    if (collapsedAtStart) controller.endDragOpen(moved ? lastPx : null);
    if (!moved) controller.toggle();
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
}

function readLayoutZoom(): number {
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--app-zoom"),
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}
