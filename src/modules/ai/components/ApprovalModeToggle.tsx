import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setAiApprovalMode } from "@/modules/settings/store";
import {
  ArrowDown01Icon,
  FlashIcon,
  Shield02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";

const MODES = [
  {
    id: "review",
    icon: Shield02Icon,
    labelKey: "ai.approvalMode.review",
    hintKey: "ai.approvalMode.reviewHint",
  },
  {
    id: "auto",
    icon: FlashIcon,
    labelKey: "ai.approvalMode.auto",
    hintKey: "ai.approvalMode.autoHint",
  },
] as const;

/**
 * 工具调用审批模式切换："review" 每次命令/文件修改前确认，"auto" 直接执行。
 * 写入全局偏好，主窗口的 Agent 工具通过 preferences store 同步读取。
 */
export function ApprovalModeToggle() {
  const { t } = useTranslation();
  const mode = usePreferencesStore((s) => s.aiApprovalMode);
  const active = MODES.find((m) => m.id === mode) ?? MODES[0];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="h-6 gap-1 rounded-md border-border/60 bg-card px-1.5 text-[10.5px] text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
          title={t("ai.approvalMode.title")}
        >
          <HugeiconsIcon icon={ActiveIcon} size={11} strokeWidth={1.75} />
          <span>{t(active.labelKey)}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={10}
            strokeWidth={2}
            className="opacity-70"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <DropdownMenuItem
              key={m.id}
              onSelect={() => void setAiApprovalMode(m.id)}
              className={cn(
                "flex items-start gap-2 text-[12px]",
                m.id === mode && "bg-accent/40",
              )}
            >
              <HugeiconsIcon
                icon={Icon}
                size={13}
                strokeWidth={1.75}
                className="mt-0.5 text-muted-foreground"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span>{t(m.labelKey)}</span>
                <span className="line-clamp-1 text-[10.5px] text-muted-foreground">
                  {t(m.hintKey)}
                </span>
              </span>
              {m.id === mode ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={12}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-foreground"
                />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
