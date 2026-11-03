import type {
  JsonObject,
  JsonValue,
  EffortConfig,
  EffortLevel,
  ModelEntry,
  ParamDef,
  ProviderEntry,
  ResolvedRequestParams,
} from "./types";

/**
 * 请求参数引擎。
 *
 * 合并顺序（后者覆盖前者）：
 *   1. Provider 级自定义参数
 *   2. Model 级自定义参数（同 key 整体替换）
 *   3. 当前思考强度档位的取值（写入 EffortConfig.path 指向的键）
 *   4. 模型的原始 `extra` JSON 覆盖
 *
 * 值为 `null` 表示从请求体中移除该键——这是厂商不接受某个取值、
 * 只能靠省略参数来表达“关闭思考”的方式。
 */

/** 传输层独占的 body 键，用户参数不得覆盖。 */
export const PROTECTED_BODY_KEYS: ReadonlySet<string> = new Set([
  "messages",
  "model",
  "stream",
  "tools",
  "tool_choice",
  "input",
]);

function isObject(v: JsonValue | undefined): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 点号路径会创建嵌套对象；`null` 值删除对应的叶子节点。 */
function setAtPath(target: JsonObject, path: string, value: JsonValue | null): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cursor: JsonObject = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cursor[key];
    if (!isObject(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as JsonObject;
  }
  const leaf = parts[parts.length - 1];
  if (value === null) delete cursor[leaf];
  else cursor[leaf] = value;
}

function mergeAtPath(target: JsonObject, path: string, value: JsonValue): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cursor: JsonObject = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cursor[key];
    if (!isObject(next)) cursor[key] = {};
    cursor = cursor[key] as JsonObject;
  }
  const leaf = parts[parts.length - 1];
  const existing = cursor[leaf];
  if (isObject(existing) && isObject(value)) {
    cursor[leaf] = deepMerge(existing, value);
  } else {
    cursor[leaf] = value;
  }
}

function deepMerge(base: JsonObject, patch: JsonObject): JsonObject {
  const out: JsonObject = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const prev = out[key];
    out[key] = isObject(prev) && isObject(value) ? deepMerge(prev, value) : value;
  }
  return out;
}

/** Provider 参数提供共享定义；模型重新声明同一 `key` 时会整体替换该定义。 */
export function mergeParamDefs(
  provider: ProviderEntry,
  model: ModelEntry,
): ParamDef[] {
  const byKey = new Map<string, ParamDef>();
  for (const def of provider.params) byKey.set(def.key, def);
  for (const def of model.params) byKey.set(def.key, def);
  return [...byKey.values()];
}

/** 思考强度配置：模型优先，其次 Provider 兜底。 */
export function effortConfig(
  provider: ProviderEntry,
  model: ModelEntry,
): EffortConfig | null {
  return model.effort ?? provider.effort;
}

export function effortLevels(
  provider: ProviderEntry,
  model: ModelEntry,
): EffortLevel[] {
  return effortConfig(provider, model)?.levels ?? [];
}

export function effortDefaultLevelId(
  provider: ProviderEntry,
  model: ModelEntry,
): string | null {
  const config = effortConfig(provider, model);
  if (!config || config.levels.length === 0) return null;
  const wanted = config.default;
  return config.levels.some((l) => l.id === wanted)
    ? (wanted as string)
    : config.levels[0].id;
}

export function effortLevelIndex(
  provider: ProviderEntry,
  model: ModelEntry,
  levelId: string | null | undefined,
): number {
  const levels = effortLevels(provider, model);
  if (levels.length === 0) return -1;
  if (levelId) {
    const idx = levels.findIndex((l) => l.id === levelId);
    if (idx >= 0) return idx;
  }
  const fallback = effortDefaultLevelId(provider, model);
  const idx = levels.findIndex((l) => l.id === fallback);
  return idx >= 0 ? idx : 0;
}

function applyBodyValue(
  body: JsonObject,
  path: string,
  value: JsonValue | null,
  warnings: string[],
  source: string,
): void {
  const segments = path.split(".");
  if (PROTECTED_BODY_KEYS.has(segments[0])) {
    warnings.push(`Body key "${path}" is transport-owned; skipped (${source})`);
    return;
  }
  setAtPath(body, path, value);
}

/**
 * 解析一次请求的全部参数。纯函数且同步——UI 可用于预览，
 * 传输层在构建模型前调用。
 */
export function resolveRequestParams(
  provider: ProviderEntry,
  model: ModelEntry,
  levelId?: string | null,
): ResolvedRequestParams {
  const body: JsonObject = {};
  const warnings: string[] = [];
  const defs = mergeParamDefs(provider, model);

  for (const def of defs) {
    if (!def.enabled) continue;
    if (def.value === null) continue;
    applyBodyValue(body, def.key, def.value, warnings, `param "${def.key}"`);
  }

  const config = effortConfig(provider, model);
  const levels = effortLevels(provider, model);
  const index = effortLevelIndex(provider, model, levelId);
  const active = index >= 0 ? levels[index] : null;
  if (config && active && active.value !== null) {
    applyBodyValue(
      body,
      config.path,
      active.value,
      warnings,
      `effort level "${active.id}"`,
    );
  }

  for (const [key, value] of Object.entries(model.extra)) {
    const segments = key.split(".");
    if (PROTECTED_BODY_KEYS.has(segments[0])) {
      warnings.push(`Extra key "${key}" is transport-owned; skipped`);
      continue;
    }
    if (value === null) setAtPath(body, key, null);
    else mergeAtPath(body, key, value);
  }

  return { body, warnings };
}
