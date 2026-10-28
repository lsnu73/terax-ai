import type {
  JsonObject,
  JsonValue,
  ModelEntry,
  ParamDef,
  ProviderEntry,
  ResolvedRequestParams,
  ThinkingConfig,
  ThinkingLevel,
} from "./types";

/**
 * 请求参数引擎。
 *
 * 合并顺序（后者覆盖前者）：
 *   1. Provider 级参数默认值
 *   2. Model 级参数默认值
 *   3. 当前思考档位的取值（经过各参数的 `map`）
 *   4. 模型的原始 `extra` JSON 覆盖
 *
 * 值为 `null`（无论来自档位还是 `map` 产出）表示从请求体中移除该键，
 * 这是厂商不接受某个值、只能靠省略参数来表达“关闭思考”的方式。
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

const PROTECTED_HEADERS: ReadonlySet<string> = new Set([
  "host",
  "content-length",
  "connection",
  "authorization",
  "content-type",
  "accept",
  "transfer-encoding",
]);

function isObject(v: JsonValue | undefined): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function equalJson(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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

export function thinkingLevels(
  provider: ProviderEntry,
  model: ModelEntry,
): ThinkingLevel[] {
  const config: ThinkingConfig | null = model.thinking ?? provider.thinking;
  return config?.levels ?? [];
}

export function thinkingDefaultLevelId(
  provider: ProviderEntry,
  model: ModelEntry,
): string | null {
  const config = model.thinking ?? provider.thinking;
  if (!config || config.levels.length === 0) return null;
  const wanted = config.default;
  return config.levels.some((l) => l.id === wanted)
    ? (wanted as string)
    : config.levels[0].id;
}

export function thinkingLevelIndex(
  provider: ProviderEntry,
  model: ModelEntry,
  levelId: string | null | undefined,
): number {
  const levels = thinkingLevels(provider, model);
  if (levels.length === 0) return -1;
  if (levelId) {
    const idx = levels.findIndex((l) => l.id === levelId);
    if (idx >= 0) return idx;
  }
  const fallback = thinkingDefaultLevelId(provider, model);
  const idx = levels.findIndex((l) => l.id === fallback);
  return idx >= 0 ? idx : 0;
}

function wireValue(
  def: ParamDef,
  logical: JsonValue,
  warnings: string[],
): JsonValue | null {
  if (!def.map) return logical;
  const key = typeof logical === "string" ? logical : JSON.stringify(logical);
  if (!(key in def.map)) return logical;
  const mapped = def.map[key];
  if (mapped === null) return null;
  if (def.enum && !def.enum.some((v) => equalJson(v, mapped))) {
    warnings.push(
      `Param "${def.key}": mapped value ${JSON.stringify(mapped)} is outside enum; skipped`,
    );
    return null;
  }
  return mapped;
}

function checkStaticValue(
  def: ParamDef,
  value: JsonValue,
  warnings: string[],
): boolean {
  if (!def.enum || def.enum.length === 0) return true;
  if (def.enum.some((v) => equalJson(v, value))) return true;
  warnings.push(
    `Param "${def.key}": value ${JSON.stringify(value)} is outside enum; skipped`,
  );
  return false;
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
  const headers: Record<string, string> = {};
  const warnings: string[] = [];
  const defs = mergeParamDefs(provider, model);

  const levels = thinkingLevels(provider, model);
  const index = thinkingLevelIndex(provider, model, levelId);
  const active = index >= 0 ? levels[index] : null;

  for (const def of defs) {
    if (!def.enabled) continue;
    const logical =
      active && def.key in active.values
        ? active.values[def.key]
        : def.default;
    if (logical === undefined) continue;
    if (logical === null) continue;
    const value = wireValue(def, logical, warnings);
    if (value === null) continue;
    if (!checkStaticValue(def, value, warnings)) continue;

    if (def.location === "header") {
      const name = (def.path || def.key).toLowerCase();
      if (PROTECTED_HEADERS.has(name)) {
        warnings.push(`Header "${def.path || def.key}" is transport-owned; skipped`);
        continue;
      }
      headers[def.path || def.key] =
        typeof value === "string" ? value : JSON.stringify(value);
      continue;
    }

    const segments = (def.path || def.key).split(".");
    if (PROTECTED_BODY_KEYS.has(segments[0])) {
      warnings.push(`Body key "${def.path}" is transport-owned; skipped`);
      continue;
    }
    setAtPath(body, def.path || def.key, value);
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

  return { body, headers, warnings };
}
