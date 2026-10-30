import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import type { UIMessage } from "ai";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getModelContextLimit, tryResolveModel } from "../config";
import { useChatStore } from "../store/chatStore";

function estimateTokens(messages: UIMessage[]): number {
  let chars = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "text" || part.type === "reasoning") {
        chars += (part as { text?: string }).text?.length ?? 0;
      } else if (part.type.startsWith("tool-")) {
        const tool = part as unknown as { input?: unknown; output?: unknown };
        if (tool.input) chars += JSON.stringify(tool.input).length;
        if (tool.output) chars += JSON.stringify(tool.output).length;
      }
    }
  }
  return Math.ceil(chars / 4);
}

function formatTokens(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  }
  return `${(value / 1_000_000).toFixed(2)}M`;
}

export function AiContextIndicator({ messages }: { messages: UIMessage[] }) {
  const { t } = useTranslation();
  const modelId = useChatStore((s) => s.selectedModelId);
  const tokens = useChatStore((s) => s.agentMeta.tokens);
  const lastInput = useChatStore((s) => s.agentMeta.lastInputTokens);
  const lastCached = useChatStore((s) => s.agentMeta.lastCachedTokens);
  const estimated = useMemo(() => estimateTokens(messages), [messages]);
  const used = lastInput > 0 ? lastInput : estimated;
  const reported = tokens.inputTokens + tokens.outputTokens;
  const max = getModelContextLimit(modelId);
  const modelLabel = useMemo(
    () => tryResolveModel(modelId)?.label ?? modelId,
    [modelId],
  );
  const cacheRate =
    tokens.inputTokens > 0
      ? Math.round((tokens.cachedInputTokens / tokens.inputTokens) * 100)
      : 0;

  return (
    <Context usedTokens={used} maxTokens={max}>
      <ContextTrigger className="h-6 gap-1 px-0 text-[10.5px]" />
      <ContextContent className="w-64 text-[11px]">
        <ContextContentHeader />
        <ContextContentBody>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t("ai.context.model")}</span>
            <span className="font-mono text-foreground">{modelLabel}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-muted-foreground">
            <span>
              {lastInput > 0
                ? t("ai.context.lastRequest")
                : t("ai.context.estimated")}
            </span>
            <span className="font-mono text-foreground">
              {formatTokens(used)}
            </span>
          </div>
          {lastCached > 0 ? (
            <div className="mt-1 flex items-center justify-between text-muted-foreground">
              <span>{t("ai.context.ofWhichCached")}</span>
              <span className="font-mono text-foreground">
                {formatTokens(lastCached)}
              </span>
            </div>
          ) : null}
          {reported > 0 ? (
            <>
              <div className="mt-1.5 flex items-center justify-between text-muted-foreground">
                <span>{t("ai.context.sessionInput")}</span>
                <span className="font-mono text-foreground">
                  {formatTokens(tokens.inputTokens)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-muted-foreground">
                <span>{t("ai.context.sessionOutput")}</span>
                <span className="font-mono text-foreground">
                  {formatTokens(tokens.outputTokens)}
                </span>
              </div>
              {tokens.cachedInputTokens > 0 ? (
                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                  <span>{t("ai.context.cacheHit")}</span>
                  <span className="font-mono text-foreground">{cacheRate}%</span>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="mt-1 flex items-center justify-between text-muted-foreground">
            <span>{t("ai.context.window")}</span>
            <span className="font-mono text-foreground">
              {formatTokens(max)}
            </span>
          </div>
        </ContextContentBody>
        <ContextContentFooter>
          <span className="text-[10px] italic text-muted-foreground">
            {lastInput > 0
              ? t("ai.context.footerMeasured")
              : t("ai.context.footerEstimated")}
          </span>
        </ContextContentFooter>
      </ContextContent>
    </Context>
  );
}
