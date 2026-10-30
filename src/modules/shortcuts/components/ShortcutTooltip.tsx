import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactElement } from "react";
import {
  shortcutHintLabel,
  useShortcutHint,
} from "../lib/useShortcutTokens";
import type { ShortcutId } from "../shortcuts";

type ShortcutTooltipProps = {
  id: ShortcutId;
  label: string;
  children: ReactElement;
  side?: ComponentProps<typeof TooltipContent>["side"];
  align?: ComponentProps<typeof TooltipContent>["align"];
  className?: string;
};

export function ShortcutTooltip({
  id,
  label,
  children,
  side,
  align,
  className,
}: ShortcutTooltipProps) {
  const hint = useShortcutHint(id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {shortcutHintLabel(label, hint)}
      </TooltipContent>
    </Tooltip>
  );
}

export function ShortcutHint({
  id,
  className,
}: {
  id: ShortcutId;
  className?: string;
}) {
  const hint = useShortcutHint(id);
  if (!hint) return null;
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {hint}
    </span>
  );
}
