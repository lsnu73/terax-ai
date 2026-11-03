import {
  autocompleteDefaultModel,
  modelSupportsTemperature,
  effortLevels,
  tryResolveModel,
} from "@/modules/ai/config";
import { buildLanguageModel } from "@/modules/ai/lib/agent";
import { EMPTY_PROVIDER_KEYS } from "@/modules/ai/lib/keyring";
import { generateText } from "ai";
import {
  buildUserPrompt,
  COMPLETION_SYSTEM_PROMPT,
  type CompletionRequest,
} from "./prompt";

export type CompletionDeps = {
  provider: string;
  modelId: string;
  apiKey: string | null;
};

const MAX_OUTPUT_TOKENS_DEFAULT = 128;
// 推理模型会先把输出 token 花在内部思考上，然后才产出可见内容；
// 上限太紧时会出现 finish_reason="length" 且文本为空。
// 后续的修剪步骤仍会把可见输出限制在 MAX_LINES 内。
const MAX_OUTPUT_TOKENS_REASONING = 1024;

/**
 * 行内补全。复用共享的模型构建器，并强制使用最左档位（关闭思考），
 * 以保证按键响应延迟足够低。
 */
export async function requestCompletion(
  req: CompletionRequest,
  deps: CompletionDeps,
  signal: AbortSignal,
): Promise<string> {
  const modelId =
    deps.modelId.trim() || autocompleteDefaultModel(deps.provider);
  if (!modelId) {
    throw new Error(`No autocomplete model configured for ${deps.provider}.`);
  }
  const info = tryResolveModel(modelId);
  if (!info) {
    throw new Error(
      `Autocomplete model "${modelId}" is not in the configuration.`,
    );
  }
  const levels = effortLevels(info.providerEntry, info.model);
  const levelId = levels[0]?.id ?? null;
  const model = await buildLanguageModel(
    info.providerEntry,
    info.model,
    { ...EMPTY_PROVIDER_KEYS, [info.provider]: deps.apiKey },
    levelId,
  );

  const hasThinking = levels.length > 0;
  const outputCap = Math.min(
    info.outputTokens,
    hasThinking ? MAX_OUTPUT_TOKENS_REASONING : MAX_OUTPUT_TOKENS_DEFAULT,
  );

  const { text } = await generateText({
    model,
    system: COMPLETION_SYSTEM_PROMPT,
    prompt: buildUserPrompt(req),
    maxOutputTokens: outputCap,
    maxRetries: 0,
    abortSignal: signal,
    ...(modelSupportsTemperature(info.provider, modelId)
      ? { temperature: 0.1 }
      : {}),
  });

  return cleanCompletion(text);
}

function cleanCompletion(raw: string): string {
  let t = raw;
  const fence = t.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  if (fence) t = fence[1];
  t = t.replace(/^<\|cursor\|>/, "");
  return t;
}
