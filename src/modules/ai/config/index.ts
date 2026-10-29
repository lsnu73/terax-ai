export {
  BUILTIN_PROVIDER_IDS,
  builtinProviders,
  defaultAiConfig,
} from "./defaults";
export { normalizeAiConfig, normalizeParam } from "./normalize";
export {
  mergeParamDefs,
  PROTECTED_BODY_KEYS,
  resolveRequestParams,
  thinkingDefaultLevelId,
  thinkingLevelIndex,
  thinkingLevels,
} from "./params";
export {
  AI_CONFIG_STORE_PATH,
  onAiConfigChange,
  openAiConfigDir,
  readAiConfig,
  writeAiConfig,
} from "./persist";
export {
  builtinSystemPrompt,
  MAX_AGENT_STEPS,
  selectSystemPrompt,
  TOOL_PROTOCOL_TAIL,
} from "./prompts";
export {
  allKeyringAccounts,
  autocompleteDefaultModel,
  findModel,
  findProvider,
  getAiConfig,
  getDefaultModelId,
  getModelContextLimit,
  getProvider,
  getProviderIconKey,
  isKnownModelId,
  listModels,
  listProviders,
  modelKeepsReasoning,
  modelSupportsTemperature,
  providerNeedsKey,
  providerSupportsKey,
  resolveModel,
  selectSystemPromptForModel,
  setAiConfig,
  subscribeAiConfig,
  systemPromptKind,
  toModelInfo,
  tryResolveModel,
} from "./registry";
export { getAiConfigSnapshot, useAiConfigStore } from "./store";
export type {
  AiConfig,
  AuthConfig,
  JsonObject,
  JsonValue,
  ModelEntry,
  ModelInfo,
  ModelsApiConfig,
  ParamDef,
  ParamLocation,
  ParamType,
  ProtocolId,
  ProviderEntry,
  ResolvedRequestParams,
  SystemPromptKind,
  SystemPromptOverrides,
  ThinkingConfig,
  ThinkingLevel,
} from "./types";

/** 动态 ID 就是普通字符串；保留别名只为让调用处更易读。 */
export type ModelId = string;
export type ProviderId = string;
export type AutocompleteProviderId = string;
export type ProviderInfo = import("./types").ProviderEntry;
