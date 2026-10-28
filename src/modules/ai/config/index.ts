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
  ThinkingConfig,
  ThinkingLevel,
} from "./types";

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
  STT_KEY_ACCOUNTS,
  subscribeAiConfig,
  systemPromptKind,
  toModelInfo,
  tryResolveModel,
} from "./registry";

export {
  mergeParamDefs,
  PROTECTED_BODY_KEYS,
  resolveRequestParams,
  thinkingDefaultLevelId,
  thinkingLevelIndex,
  thinkingLevels,
} from "./params";

export { builtinProviders, BUILTIN_PROVIDER_IDS, defaultAiConfig } from "./defaults";
export { normalizeAiConfig, normalizeParam } from "./normalize";
export {
  AI_CONFIG_STORE_PATH,
  getAiConfigFilePath,
  onAiConfigChange,
  readAiConfig,
  writeAiConfig,
} from "./persist";
export { getAiConfigSnapshot, useAiConfigStore } from "./store";
export {
  DEFAULT_STT_PROVIDER,
  MAX_AGENT_STEPS,
  STT_PROVIDER_LABELS,
  WHISPERCPP_DEFAULT_BASE_URL,
  selectSystemPrompt,
  type SttProvider,
} from "./prompts";

/** 动态 ID 就是普通字符串；保留别名只为让调用处更易读。 */
export type ModelId = string;
export type ProviderId = string;
export type AutocompleteProviderId = string;
export type ProviderInfo = import("./types").ProviderEntry;
