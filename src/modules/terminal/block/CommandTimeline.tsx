import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "@/modules/terminal/ghostty/GhosttyBlocks";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type TimelineData = {
  items: TimelineEntry[];
  totalLines: number;
};

/** At-rest bar width; the hovered bar stretches to WIDTH_MAX. */
const WIDTH_BASE = 12;
const WIDTH_MAX = 24;
/** Horizontal hit slop so thin bars stay easy to catch. */
const HIT_SLOP = 8;
/** Cluster layout: bars pack at this rhythm from the top of the pane. */
const CLUSTER_TOP = 10;
const CLUSTER_BOTTOM = 10;
const CLUSTER_GAP = 12;
/** Wave falloff: neighbour bars widen toward the hovered one (gaussian). */
const WAVE_FALLOFF = 1.5;

/**
 * 命令时间线：终端右缘内嵌的整段会话索引。每条执行过的命令一根细短条，
 * 全部按固定节奏聚拢成一列（条数放不下时压缩间距铺满可视高度），不再按
 * 缓冲位置散落在各块旁；悬停的条最长最深，相邻条按高斯衰减变宽形成波浪，
 * 悬停显示命令 Tooltip，点击选中该块并平滑滚动到它。Ctrl+L 清屏等清空
 * 块元数据的路径会随 revision 自然清空此列。
 */
export function CommandTimeline({
  data,
  onReveal,
}: {
  data: TimelineData;
  onReveal: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const [height, setHeight] = useState(0);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const hasBars = data.items.length > 0;

  // The strip spans the pane; measure it so the cluster knows when to stop
  // packing at CLUSTER_GAP and start compressing. Re-measured on resizes.
  useEffect(() => {
    const el = stripRef.current;
    if (!el || !hasBars) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBars]);

  if (!hasBars) return null;

  // 聚拢布局：首根条从第二个槽位开始，后续依次后移；顶部预留的一个
  // 槽位也计入压缩分母，保证最后一根条不会越过底部留白。
  const usable = Math.max(0, height - CLUSTER_TOP - CLUSTER_BOTTOM);
  const gap = Math.min(CLUSTER_GAP, usable / data.items.length);

  // 波浪：悬停条最长，相邻条按高斯衰减收窄回基础宽度；配合 transition
  // 在条间移动时呈现连续的波浪动画。
  const widthFor = (index: number) => {
    if (hover === null) return WIDTH_BASE;
    if (hover === index) return WIDTH_MAX;
    const distance = index - hover;
    return (
      WIDTH_BASE +
      (WIDTH_MAX - WIDTH_BASE) * Math.exp(-(distance * distance) / WAVE_FALLOFF)
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover tracker for the wave effect; the buttons inside carry all semantics. */}
      <div
        ref={stripRef}
        data-command-timeline
        className="pointer-events-auto absolute inset-y-0 right-[11px] w-4"
        onMouseMove={(event) => {
          if (gap <= 0) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const index =
            Math.round((event.clientY - bounds.top - CLUSTER_TOP) / gap) - 1;
          setHover(index >= 0 && index < data.items.length ? index : null);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {data.items.map((item, index) => {
          const top = CLUSTER_TOP + (index + 1) * gap;
          const hovered = hover === index;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={item.command}
                  onClick={() => onReveal(item.id)}
                  style={{
                    top,
                    // 命中槽固定到最大宽度并占满整个纵向间距；视觉条再
                    // 怎样伸缩，相邻槽之间都没有悬停/点击真空区。
                    width: WIDTH_MAX + HIT_SLOP,
                    height: gap,
                    transform: "translateY(-50%)",
                  }}
                  className="absolute right-0 flex items-center justify-end"
                >
                  <span
                    style={{ width: widthFor(index) }}
                    className={cn(
                      "rounded-full transition-[width,height,background-color] duration-150 ease-out",
                      hovered ? "h-[3px]" : "h-[2px]",
                      item.running
                        ? hovered
                          ? "bg-amber-400"
                          : "bg-amber-500/70"
                        : item.ok
                          ? hovered
                            ? "bg-foreground/90"
                            : "bg-foreground/30"
                          : hovered
                            ? "bg-destructive"
                            : "bg-destructive/60",
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-72 p-2">
                <span className="block max-h-40 overflow-y-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-snug text-background">
                  {item.command || t("terminal.block.commandFallback")}
                </span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
