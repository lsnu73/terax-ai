import { usePreferencesStore } from "@/modules/settings/preferences";
import type { AiApprovalMode } from "@/modules/settings/store";

/**
 * AI 工具调用审批模式。"review"（默认）在每次命令执行 / 文件修改前暂停等
 * 用户确认；"auto" 跳过确认直接执行。安全护栏（security.ts 的路径与命令
 * 检查）在两种模式下都始终生效 —— auto 关掉的是确认 UI，不是安全检查。
 */
export function getAiApprovalMode(): AiApprovalMode {
  return usePreferencesStore.getState().aiApprovalMode;
}

export function isAiAutoApprove(): boolean {
  return getAiApprovalMode() === "auto";
}

/**
 * AI SDK `needsApproval` 回调：按当前审批模式决定是否暂停请求确认。
 * 读取 getter 而非快照，模式在会话中途切换后下一次工具调用即生效。
 */
export function aiNeedsApproval(): boolean {
  return !isAiAutoApprove();
}
