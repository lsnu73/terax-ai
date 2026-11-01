export {
  BUILTIN_PROVIDER_IDS,
  builtinProviders,
  defaultAiConfig,
} from "./defaults";
export { normalizeAiConfig, normalizeParam } from "./normalize";
export {
  effortConfig,
  effortDefaultLevelId,
  effortLevelIndex,
  effortLevels,
  mergeParamDefs,
  PROTECTED_BODY_KEYS,
  resolveRequestParams,
} from "./params";
export {
  AI_CONFIG_STORE_PATH,
  onAiConfigChange,
  openAiConfigDir,
  readAiConfig,
  writeAiConfig,
} from "./persist";
export {
  BUILTIN_COMMIT_MESSAGE_PROMPT,
  builtinSystemPrompt,
  MAX_AGENT_STEPS,
  selectCommitMessagePrompt,
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
  EffortConfig,
  EffortLevel,
  JsonObject,
  JsonValue,
  ModelEntry,
  ModelInfo,
  ModelsApiConfig,
  ParamDef,
  ProtocolId,
  ProviderEntry,
  ResolvedRequestParams,
  SystemPromptKind,
  SystemPromptOverrides,
} from "./types";

/** 动态 ID 就是普通字符串；保留别名只为让调用处更易读。 */
export type ModelId = string;
export type ProviderId = string;
export type AutocompleteProviderId = string;
export type ProviderInfo = import("./types").ProviderEntry;
