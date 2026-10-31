import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import {
  getDefaultModelId,
  MAX_AGENT_STEPS,
  modelKeepsReasoning,
  providerNeedsKey,
  resolveModel,
  resolveRequestParams,
  selectSystemPromptForModel,
  type ModelEntry,
  type ProviderEntry,
  type ResolvedRequestParams,
} from "../config";
import { t } from "@/modules/i18n";
import { buildTools, type ToolContext } from "../tools/tools";
import type { ProviderKeys } from "./keyring";
import { compactModelMessagesDetailed } from "./compact";
import { prepareAgentPrompt } from "./prompt";
import { authHeaders, resolveProviderFetch } from "./providerHttp";

const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> =
  {
    read_file: (i) => t("ai.steps.reading", { path: shortPath(i.path) }),
    list_directory: (i) => t("ai.steps.listing", { path: shortPath(i.path) }),
    grep: (i) =>
      t("ai.steps.grepping", {
        pattern: ellipsize(String(i.pattern ?? ""), 40),
      }),
    glob: (i) =>
      t("ai.steps.globbing", {
        pattern: ellipsize(String(i.pattern ?? ""), 40),
      }),
    edit: (i) => t("ai.steps.editing", { path: shortPath(i.path) }),
    multi_edit: (i) => t("ai.steps.editing", { path: shortPath(i.path) }),
    write_file: (i) => t("ai.steps.writingFile", { path: shortPath(i.path) }),
    create_directory: (i) =>
      t("ai.steps.creating", { path: shortPath(i.path) }),
    bash_run: (i) =>
      t("ai.steps.running", {
        command: ellipsize(String(i.command ?? ""), 60),
      }),
    bash_background: (i) =>
      t("ai.steps.spawning", {
        command: ellipsize(String(i.command ?? ""), 60),
      }),
    bash_logs: () => t("ai.steps.readingLogs"),
    bash_list: () => t("ai.steps.listingProcesses"),
    bash_kill: () => t("ai.steps.stoppingProcess"),
    suggest_command: (i) =>
      t("ai.steps.suggesting", {
        command: ellipsize(String(i.command ?? ""), 60),
      }),
    todo_write: (i) =>
      t("ai.steps.updatingPlan", {
        count: Array.isArray(i.todos) ? i.todos.length : 0,
      }),
    run_subagent: (i) =>
      t("ai.steps.spawningSubagent", { type: String(i.type ?? "subagent") }),
  };

function shortPath(p: unknown): string {
  if (typeof p !== "string") return "";
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function ellipsize(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const modelCache = new Map<string, LanguageModel>();

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 把解析后的参数补丁深合并进 SDK 生成的 JSON 请求体。
 *  `null` 值表示删除该键。 */
function mergePayload(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete out[key];
      continue;
    }
    const previous = out[key];
    out[key] =
      isPlainObject(previous) && isPlainObject(value)
        ? mergePayload(previous, value)
        : value;
  }
  return out;
}

/**
 * 包装传输层 fetch，把用户声明的任意参数合并进请求体。
 * 这里刻意不感知厂商：参数名和取值全部来自 JSON 配置，
 * 绝不硬编码在本文件中。
 */
function withRequestParams(
  base: typeof fetch,
  params: ResolvedRequestParams,
): typeof fetch {
  if (Object.keys(params.body).length === 0) {
    return base;
  }
  return (input, init) => {
    if (!init) return base(input, init);
    let body = init.body;
    if (typeof body === "string" && body.length > 0) {
      try {
        const parsed: unknown = JSON.parse(body);
        if (isPlainObject(parsed)) {
          body = JSON.stringify(mergePayload(parsed, params.body));
        }
      } catch {
        // 非 JSON 请求体保持原样。
      }
    }
    return base(input, { ...init, body });
  };
}

type AdapterArgs = {
  provider: ProviderEntry;
  apiKey: string | null;
  modelId: string;
  params: ResolvedRequestParams;
};

type Adapter = (args: AdapterArgs) => Promise<LanguageModel>;

const ADAPTERS: Record<string, Adapter> = {
  "openai-compatible": async ({ provider, apiKey, modelId, params }) => {
    const { createOpenAICompatible } = await import(
      "@ai-sdk/openai-compatible"
    );
    const fetchImpl = withRequestParams(
      resolveProviderFetch(provider.baseURL),
      params,
    );
    return createOpenAICompatible({
      name: provider.id,
      baseURL: provider.baseURL,
      apiKey: provider.auth.mode === "bearer" ? apiKey || undefined : undefined,
      headers: {
        ...provider.headers,
        ...authHeaders(provider, apiKey),
      },
      fetch: fetchImpl,
    })(modelId);
  },
  anthropic: async ({ provider, apiKey, modelId, params }) => {
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    return createAnthropic({
      apiKey: apiKey || undefined,
      headers: {
        ...provider.headers,
        ...authHeaders(provider, apiKey),
      },
      fetch: withRequestParams(resolveProviderFetch(provider.baseURL), params),
      baseURL: provider.baseURL || undefined,
    })(modelId);
  },
  google: async ({ provider, apiKey, modelId, params }) => {
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    return createGoogleGenerativeAI({
      apiKey: apiKey || undefined,
      headers: {
        ...provider.headers,
        ...authHeaders(provider, apiKey),
      },
      fetch: withRequestParams(resolveProviderFetch(provider.baseURL), params),
      baseURL: provider.baseURL || undefined,
    })(modelId);
  },
};

/**
 * 为一个 Provider/Model 组合构建 `LanguageModel`。这是全应用唯一
 * 感知传输 SDK 的地方。Provider 的行为来自配置；这里的 switch 只覆盖
 * 一个很小且封闭的 `protocol` 枚举。
 */
export async function buildLanguageModel(
  provider: ProviderEntry,
  model: ModelEntry,
  keys: ProviderKeys,
  effortLevelId?: string | null,
): Promise<LanguageModel> {
  const apiKey = keys[provider.id] ?? null;
  if (providerNeedsKey(provider) && !apiKey) {
    throw new Error(t("ai.agentErrors.noApiKey", { provider: provider.label }));
  }
  if (!provider.baseURL.trim()) {
    throw new Error(
      t("ai.agentErrors.emptyBaseUrl", { provider: provider.label }),
    );
  }
  const params = resolveRequestParams(provider, model, effortLevelId);
  for (const warning of params.warnings) {
    console.warn(`[ai-config] ${warning}`);
  }
  const cacheKey = [
    provider.id,
    provider.protocol,
    provider.baseURL,
    provider.auth.mode,
    apiKey ?? "",
    JSON.stringify(provider.headers),
    model.id,
    JSON.stringify(params.body),
  ].join("\u0000");
  const hit = modelCache.get(cacheKey);
  if (hit) return hit;

  const adapter = ADAPTERS[provider.protocol];
  if (!adapter) {
    throw new Error(
      t("ai.agentErrors.unsupportedProtocol", {
        protocol: provider.protocol,
      }),
    );
  }
  const built = await adapter({
    provider,
    apiKey,
    modelId: model.id,
    params,
  });
  modelCache.set(cacheKey, built);
  return built;
}

export type BuildConfiguredOptions = {
  effortLevelId?: string | null;
};

/** 通过配置解析模型 ID，然后构建模型实例。 */
export function buildConfiguredLanguageModel(
  modelId: string,
  keys: ProviderKeys,
  opts: BuildConfiguredOptions = {},
): Promise<LanguageModel> {
  const info = resolveModel(modelId);
  return buildLanguageModel(
    info.providerEntry,
    info.model,
    keys,
    opts.effortLevelId,
  );
}

const PLAN_MODE_PROMPT = `## PLAN MODE — ACTIVE
Mutating tools (write_file, edit, multi_edit, create_directory) will queue their changes for the user to review as a single diff. Do NOT execute bash_run or bash_background while plan mode is active — restrict yourself to reads (read_file, grep, glob, list_directory) and the queued mutations. After queueing the full set of edits, stop and return a brief summary; do not continue acting until the user has accepted/rejected.`;

function buildStableSystem(
  modelId: string,
  persona: { name: string; instructions: string } | null,
  customInstructions: string | undefined,
  projectMemory: string | null,
): string {
  const base = selectSystemPromptForModel(modelId);
  const personaBlock = persona?.instructions.trim()
    ? `\n\n## ACTIVE AGENT — ${persona.name}\n${persona.instructions.trim()}`
    : "";
  const customBlock = customInstructions?.trim()
    ? `\n\n## USER CUSTOM INSTRUCTIONS — follow unless they conflict with safety rules above\n${customInstructions.trim()}`
    : "";
  const memoryBlock =
    projectMemory && projectMemory.trim().length > 0
      ? `\n\n## PROJECT — TERAX.md\n${projectMemory.trim()}`
      : "";
  return `${base}${memoryBlock}${personaBlock}${customBlock}`;
}

export type AgentUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type AgentUsageDelta = AgentUsage & {
  lastInputTokens: number;
  lastCachedTokens: number;
};

export type RunAgentOptions = {
  keys: ProviderKeys;
  modelId?: string;
  /** 该模型在思考强度滑块上选中的档位。 */
  effortLevelId?: string | null;
  customInstructions?: string;
  agentPersona?: { name: string; instructions: string } | null;
  toolContext: ToolContext;
  onStep?: (step: string | null) => void;
  onUsage?: (delta: AgentUsageDelta) => void;
  onCompact?: (info: { droppedCount: number }) => void;
  onFinishMeta?: (info: { hitStepCap: boolean; finishReason: string }) => void;
  planMode?: boolean;
  projectMemory?: string | null;
  uiMessages: UIMessage[];
  abortSignal?: AbortSignal;
};

export async function runAgentStream(opts: RunAgentOptions) {
  const modelId = opts.modelId || getDefaultModelId();
  if (!modelId) {
    throw new Error(t("ai.agentErrors.noModelConfigured"));
  }
  const info = resolveModel(modelId);
  const model = await buildLanguageModel(
    info.providerEntry,
    info.model,
    opts.keys,
    opts.effortLevelId,
  );

  const stableSystem = buildStableSystem(
    modelId,
    opts.agentPersona ?? null,
    opts.customInstructions,
    opts.projectMemory ?? null,
  );

  const history = await convertToModelMessages(opts.uiMessages);
  const keepsReasoning = modelKeepsReasoning(info);
  const prunedHistory = pruneMessages({
    messages: history,
    reasoning: keepsReasoning ? "none" : "before-last-message",
    emptyMessages: "remove",
  });
  const compact = compactModelMessagesDetailed(prunedHistory, info.inputTokens);
  const compactedHistory = compact.messages;
  if (compact.compacted) {
    opts.onCompact?.({ droppedCount: compact.droppedCount });
  }

  const prompt = prepareAgentPrompt(
    stableSystem,
    opts.planMode ? PLAN_MODE_PROMPT : null,
    compactedHistory,
    info.providerEntry.protocol,
  );

  let stepsSeen = 0;
  return streamText({
    model,
    system: prompt.system,
    messages: prompt.messages,
    allowSystemInMessages: false,
    maxOutputTokens: info.outputTokens,
    tools: buildTools(opts.toolContext),
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    abortSignal: opts.abortSignal,
    onStepFinish: (step) => {
      stepsSeen++;
      if (opts.onStep) {
        const last = step.toolCalls?.[step.toolCalls.length - 1];
        if (last) {
          const label = TOOL_LABELS[last.toolName];
          opts.onStep(
            label
              ? label((last.input ?? {}) as Record<string, unknown>)
              : t("ai.steps.calling", { tool: last.toolName }),
          );
        } else if (step.text) {
          opts.onStep(t("ai.common.writing"));
        }
      }
      if (opts.onUsage && step.usage) {
        const u = step.usage;
        const stepInput = u.inputTokens ?? 0;
        const stepCached = u.inputTokenDetails?.cacheReadTokens ?? 0;
        opts.onUsage({
          inputTokens: stepInput,
          outputTokens: u.outputTokens ?? 0,
          cachedInputTokens: stepCached,
          lastInputTokens: stepInput,
          lastCachedTokens: stepCached,
        });
      }
    },
    onFinish: (result) => {
      opts.onStep?.(null);
      const finishReason =
        (result as { finishReason?: string } | undefined)?.finishReason ?? "";
      opts.onFinishMeta?.({
        hitStepCap: stepsSeen >= MAX_AGENT_STEPS,
        finishReason,
      });
    },
  });
}
