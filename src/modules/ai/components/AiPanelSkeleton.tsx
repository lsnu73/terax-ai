import { Skeleton } from "@/components/ui/skeleton";

/**
 * AI 面板懒加载分包期间的占位骨架，与真实布局同构（头部、消息区、输入区）。
 * 分包在启动空档已预热，通常一闪而过；仅在分包未就绪时短暂可见。
 */
export function AiPanelSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-card/60 px-3 select-none">
        <span className="text-[12px] font-semibold tracking-tight">
          Terax AI
        </span>
        <Skeleton className="h-4 w-24 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="size-6 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden p-4">
        <Skeleton className="ml-auto h-9 w-3/5 rounded-2xl" />
        <Skeleton className="h-16 w-4/5 rounded-2xl" />
        <Skeleton className="h-4 w-2/5 rounded-2xl" />
      </div>
      <div className="shrink-0 border-t border-border/40 p-3">
        <Skeleton className="h-9 w-full rounded-xl" />
        <div className="mt-2 flex justify-end gap-2">
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
