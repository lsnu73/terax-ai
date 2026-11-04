import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const DEFAULT_RESIZE_TARGET_MINIMUM_SIZE = {
  coarse: 24,
  fine: 12,
} as const

function ResizablePanelGroup({
  className,
  resizeTargetMinimumSize = DEFAULT_RESIZE_TARGET_MINIMUM_SIZE,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      resizeTargetMinimumSize={resizeTargetMinimumSize}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  grip,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
  grip?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "group relative z-20 flex w-px select-none items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 data-[separator=active]:bg-ring/70 data-[separator=hover]:bg-ring/40 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-3 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90 [&[aria-orientation=horizontal]_[data-resizable-grip]]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />
      )}
      {grip && <ResizableGrip />}
    </ResizablePrimitive.Separator>
  )
}

/**
 * 六点握把：常驻在分隔线中央，静止时半透明，悬停/拖拽时全亮，
 * 让"这条线可以拖"不需要试错才知道。
 */
function ResizableGrip() {
  return (
    <div
      data-resizable-grip
      aria-hidden
      className="pointer-events-none z-10 flex h-8 w-3.5 shrink-0 flex-col items-center justify-center rounded-full bg-border opacity-55 shadow-xs transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-data-[separator=active]:opacity-100 group-focus-visible:opacity-100"
    >
      <div className="grid grid-cols-2 gap-x-[3px] gap-y-[3.5px]">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="size-[2px] rounded-full bg-background" />
        ))}
      </div>
    </div>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
