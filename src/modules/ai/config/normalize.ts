import { defaultAiConfig } from "./defaults";
import type {
  AiConfig,
  AuthConfig,
  JsonObject,
  JsonValue,
  ModelEntry,
  ModelsApiConfig,
  ParamDef,
  ParamLocation,
  ParamType,
  ProtocolId,
  ProviderEntry,
  ThinkingConfig,
  ThinkingLevel,
} from "./types";

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function jsonValue(v: unknown): JsonValue | undefined {
  if (v === null) return null;
  if (typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (Array.isArray(v)) {
    const out: JsonValue[] = [];
    for (const item of v) {
      const parsed = jsonValue(item);
      if (parsed !== undefined) out.push(parsed);
    }
    return out;
  }
  if (isRec(v)) return jsonObject(v);
  return undefined;
}

function jsonObject(v: Rec): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(v)) {
    const parsed = jsonValue(value);
    if (parsed !== undefined) out[key] = parsed;
  }
  return out;
}

function jsonMap(v: unknown): Record<string, JsonValue | null> | undefined {
  if (!isRec(v)) return undefined;
  const out: Record<string, JsonValue | null> = {};
  for (const [key, value] of Object.entries(v)) {
    const parsed = jsonValue(value);
    if (parsed !== undefined) out[key] = parsed;
  }
  return out;
}

const PARAM_TYPES: ReadonlySet<string> = new Set([
  "string",
  "number",
  "boolean",
  "object",
  "array",
]);

const PROTOCOLS: ReadonlySet<string> = new Set([
  "openai-compatible",
  "anthropic",
  "google",
]);

export function normalizeParam(raw: unknown): ParamDef | null {
  if (!isRec(raw)) return null;
  const key = str(raw.key).trim();
  if (!key) return null;
  const location: ParamLocation = raw.location === "header" ? "header" : "body";
  const type: ParamType = PARAM_TYPES.has(str(raw.type))
    ? (raw.type as ParamType)
    : "string";
  const map = jsonMap(raw.map);
  const enumValues = Array.isArray(raw.enum)
    ? (raw.enum
        .map((v) => jsonValue(v))
        .filter((v) => v !== undefined) as JsonValue[])
    : undefined;
  return {
    key,
    label: str(raw.label) || key,
    location,
    path: str(raw.path).trim() || key,
    type,
    ...(raw.default !== undefined
      ? { default: jsonValue(raw.default) }
      : {}),
    ...(enumValues && enumValues.length > 0 ? { enum: enumValues } : {}),
    ...(map && Object.keys(map).length > 0 ? { map } : {}),
    enabled: raw.enabled !== false,
    ...(typeof raw.description === "string" && raw.description
      ? { description: raw.description }
      : {}),
  };
}

function normalizeThinking(raw: unknown): ThinkingConfig | null {
  if (!isRec(raw)) return null;
  const levelsRaw = Array.isArray(raw.levels) ? raw.levels : [];
  const levels: ThinkingLevel[] = [];
  const seen = new Set<string>();
  for (const item of levelsRaw) {
    if (!isRec(item)) continue;
    const id = str(item.id).trim();
    if (!id || seen.has(id)) continue;
    const values = isRec(item.values) ? jsonMap(item.values) ?? {} : {};
    seen.add(id);
    levels.push({ id, label: str(item.label) || id, values });
  }
  if (levels.length === 0) return null;
  const fallback = levels[0].id;
  const wanted = str(raw.default);
  return {
    levels,
    default: seen.has(wanted) ? wanted : fallback,
    ...(str(raw.offLabel) ? { offLabel: str(raw.offLabel) } : {}),
  };
}

function normalizeModel(raw: unknown): ModelEntry | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id).trim();
  if (!id) return null;
  const params: ParamDef[] = [];
  if (Array.isArray(raw.params)) {
    raw.params.forEach((p) => {
      const parsed = normalizeParam(p);
      if (parsed) params.push(parsed);
    });
  }
  return {
    id,
    label: str(raw.label).trim() || id,
    inputTokens: Math.max(
      1_000,
      Math.round(num(raw.inputTokens, 128_000)),
    ),
    outputTokens: Math.max(1, Math.round(num(raw.outputTokens, 4_096))),
    supportsTemperature: bool(raw.supportsTemperature, true),
    supportsAutocomplete: bool(raw.supportsAutocomplete, true),
    systemPrompt: raw.systemPrompt === "lite" ? "lite" : "full",
    params,
    thinking: normalizeThinking(raw.thinking),
    extra: isRec(raw.extra) ? jsonObject(raw.extra) : {},
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === "string")
      : [],
  };
}

function normalizeAuth(raw: unknown): AuthConfig {
  if (!isRec(raw)) return { mode: "bearer", required: true };
  const mode =
    raw.mode === "none" || raw.mode === "x-api-key" ? raw.mode : "bearer";
  return {
    mode,
    required: mode === "none" ? false : bool(raw.required, true),
    ...(str(raw.header) ? { header: str(raw.header).trim() } : {}),
  };
}

function normalizeModelsApi(raw: unknown): ModelsApiConfig | null {
  if (raw === null) return null;
  if (!isRec(raw)) return null;
  return {
    path: str(raw.path).trim() || "/models",
    itemsPath: str(raw.itemsPath).trim(),
    idPath: str(raw.idPath).trim() || "id",
    ...(str(raw.labelPath) ? { labelPath: str(raw.labelPath).trim() } : {}),
  };
}

const SECRET_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "api-key",
  "x-goog-api-key",
]);

function normalizeProvider(
  raw: unknown,
  warnings: string[],
): ProviderEntry | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id).trim();
  if (!id) return null;
  const protocol: ProtocolId = PROTOCOLS.has(str(raw.protocol))
    ? (raw.protocol as ProtocolId)
    : "openai-compatible";
  const params: ParamDef[] = [];
  if (Array.isArray(raw.params)) {
    raw.params.forEach((p) => {
      const parsed = normalizeParam(p);
      if (parsed) params.push(parsed);
    });
  }
  const models: ModelEntry[] = [];
  if (Array.isArray(raw.models)) {
    for (const m of raw.models) {
      const parsed = normalizeModel(m);
      if (parsed) models.push(parsed);
    }
  }
  const headers: Record<string, string> = {};
  if (isRec(raw.headers)) {
    for (const [k, v] of Object.entries(raw.headers)) {
      if (typeof v !== "string") continue;
      if (SECRET_HEADERS.has(k.toLowerCase())) {
        warnings.push(
          `Provider "${id}": header "${k}" removed — API keys belong in the OS keychain, not the JSON file`,
        );
        continue;
      }
      headers[k] = v;
    }
  }
  const auth = normalizeAuth(raw.auth);
  return {
    id,
    label: str(raw.label).trim() || id,
    protocol,
    baseURL: str(raw.baseURL).trim(),
    ...(str(raw.consoleUrl) ? { consoleUrl: str(raw.consoleUrl).trim() } : {}),
    keyringAccount: str(raw.keyringAccount).trim() || `${id}-api-key`,
    auth,
    headers,
    modelsApi: normalizeModelsApi(raw.modelsApi),
    params,
    thinking: normalizeThinking(raw.thinking),
    models,
    icon: str(raw.icon).trim() || "plug",
    builtin: bool(raw.builtin, false),
  };
}

export type NormalizeResult = {
  config: AiConfig;
  warnings: string[];
  /** 输入中完全没有任何可用 Provider 时为 true。 */
  empty: boolean;
};

/**
 * 把从磁盘读到的任意 JSON 收敛为合法配置。未知字段被丢弃，ID 会去重，
 * 思考档位保证存在合法的默认值。遇到问题时返回 warning 而不是抛错，
 * 这样即使文件被手工改坏了一部分，其余内容仍能加载。
 */
export function normalizeAiConfig(raw: unknown): NormalizeResult {
  const warnings: string[] = [];
  if (!isRec(raw)) {
    return { config: defaultAiConfig(), warnings: ["Configuration is not an object"], empty: true };
  }

  const rawProviders = Array.isArray(raw.providers) ? raw.providers : null;
  if (rawProviders === null) {
    return {
      config: defaultAiConfig(),
      warnings: ["Missing providers[] — seeded the built-in catalog"],
      empty: true,
    };
  }

  const providers: ProviderEntry[] = [];
  const providerIds = new Set<string>();
  const modelIds = new Set<string>();
  for (const item of rawProviders) {
    const provider = normalizeProvider(item, warnings);
    if (!provider) {
      warnings.push("Skipped a provider without an id");
      continue;
    }
    if (providerIds.has(provider.id)) {
      warnings.push(`Duplicate provider id ignored: ${provider.id}`);
      continue;
    }
    providerIds.add(provider.id);
    const models: ModelEntry[] = [];
    for (const model of provider.models) {
      if (modelIds.has(model.id)) {
        warnings.push(`Duplicate model id ignored: ${model.id}`);
        continue;
      }
      modelIds.add(model.id);
      models.push(model);
    }
    provider.models = models;
    providers.push(provider);
  }

  const firstModelId = providers.flatMap((p) => p.models)[0]?.id ?? "";
  const defaultsRaw = isRec(raw.defaults)
    ? str(raw.defaults.modelId).trim()
    : str(raw.defaults).trim();
  const defaultModelId =
    defaultsRaw && modelIds.has(defaultsRaw) ? defaultsRaw : firstModelId;

  return {
    config: {
      version: Math.max(1, Math.round(num(raw.version, 1))),
      defaults: { modelId: defaultModelId },
      providers,
    },
    warnings,
    empty: providers.length === 0,
  };
}
