import { defaultAiConfig } from "./defaults";
import { selectSystemPrompt } from "./prompts";
import type {
  AiConfig,
  ModelEntry,
  ModelInfo,
  ProviderEntry,
} from "./types";

/**
 * 模型配置的同步只读视图。
 *
 * JSON 文件是唯一事实来源；本模块在内存中保留最近一次解析的快照，
 * 让所有消费方（请求链路、选择器、设置页）都能保持同步调用。
 * `setAiConfig` 是唯一写入点，并通知订阅者，使 UI 与传输层保持一致。
 */

let current: AiConfig = defaultAiConfig();
const listeners = new Set<() => void>();

export function getAiConfig(): AiConfig {
  return current;
}

export function setAiConfig(next: AiConfig): void {
  current = next;
  for (const listener of [...listeners]) listener();
}

export function subscribeAiConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listProviders(): readonly ProviderEntry[] {
  return current.providers;
}

export function findProvider(id: string): ProviderEntry | undefined {
  return current.providers.find((p) => p.id === id);
}

export function getProvider(id: string): ProviderEntry {
  const provider = findProvider(id);
  if (!provider) throw new Error(`Unknown provider: ${id}`);
  return provider;
}

export function getProviderIconKey(id: string): string {
  return findProvider(id)?.icon ?? "plug";
}

export function toModelInfo(provider: ProviderEntry, model: ModelEntry): ModelInfo {
  return {
    id: model.id,
    provider: provider.id,
    providerLabel: provider.label,
    label: model.label,
    description: provider.label,
    inputTokens: model.inputTokens,
    outputTokens: model.outputTokens,
    model,
    providerEntry: provider,
  };
}

export function listModels(providerId?: string): ModelInfo[] {
  const providers = providerId
    ? current.providers.filter((p) => p.id === providerId)
    : current.providers;
  return providers.flatMap((p) => p.models.map((m) => toModelInfo(p, m)));
}

export function findModel(modelId: string): ModelInfo | null {
  for (const provider of current.providers) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return toModelInfo(provider, model);
  }
  return null;
}

export function resolveModel(modelId: string): ModelInfo {
  const info = findModel(modelId);
  if (!info) throw new Error(`Unknown model: ${modelId}`);
  return info;
}

export function tryResolveModel(modelId: string | undefined): ModelInfo | null {
  return modelId ? findModel(modelId) : null;
}

export function isKnownModelId(id: string): boolean {
  return !!findModel(id);
}

export function getDefaultModelId(): string {
  const configured = current.defaults.modelId;
  if (configured && findModel(configured)) return configured;
  return current.providers.flatMap((p) => p.models)[0]?.id ?? "";
}

export function providerNeedsKey(provider: ProviderEntry | string): boolean {
  const entry =
    typeof provider === "string" ? findProvider(provider) : provider;
  if (!entry) return false;
  return entry.auth.mode !== "none" && entry.auth.required;
}

export function providerSupportsKey(provider: ProviderEntry | string): boolean {
  const entry =
    typeof provider === "string" ? findProvider(provider) : provider;
  if (!entry) return false;
  return entry.auth.mode !== "none";
}

export function getModelContextLimit(modelId: string | undefined): number {
  const info = tryResolveModel(modelId);
  return info?.inputTokens ?? 128_000;
}

export function modelSupportsTemperature(
  providerId: string,
  modelId: string,
): boolean {
  const info = findModel(modelId);
  if (!info) return true;
  if (providerId && info.provider !== providerId) return true;
  return info.model.supportsTemperature;
}

/** 推理模型会拒绝推理内容被剥离的工具调用轮次。 */
export function modelKeepsReasoning(info: ModelInfo): boolean {
  return info.model.tags.includes("reasoning");
}

export function autocompleteDefaultModel(providerId: string): string {
  return findProvider(providerId)?.models[0]?.id ?? "";
}

export function systemPromptKind(modelId: string): "full" | "lite" {
  return findModel(modelId)?.model.systemPrompt ?? "full";
}

export function selectSystemPromptForModel(modelId: string): string {
  return selectSystemPrompt(systemPromptKind(modelId));
}

/** 语音转写使用的 API Key 账户。它们独立于模型 Provider 目录，
 *  删除某个 Provider 不会破坏语音输入。 */
export const STT_KEY_ACCOUNTS = {
  openai: "openai-api-key",
  groq: "groq-api-key",
} as const;

export function allKeyringAccounts(): { providerId: string; account: string }[] {
  return current.providers
    .filter((p) => providerSupportsKey(p))
    .map((p) => ({ providerId: p.id, account: p.keyringAccount }));
}
