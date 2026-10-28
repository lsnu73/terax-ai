import type { ModelsApiConfig, ProviderEntry } from "../config";
import { createProxyFetch, proxyFetch } from "./proxyFetch";

const localProxyFetch = createProxyFetch({ allowPrivateNetwork: true });

export function isLoopbackLike(baseURL: string): boolean {
  try {
    const host = new URL(baseURL).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return (
      host === "localhost" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      /^127(\.\d{1,3}){3}$/.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/** 本地端点需要启用私网访问的代理；公网端点使用标准代理，
 *  以继续拦截元数据主机。 */
export function resolveProviderFetch(baseURL: string): typeof fetch {
  return isLoopbackLike(baseURL) ? localProxyFetch : proxyFetch;
}

export function authHeaders(
  provider: ProviderEntry,
  apiKey: string | null,
): Record<string, string> {
  if (!apiKey) return {};
  if (provider.auth.mode === "bearer") {
    return { Authorization: `Bearer ${apiKey}` };
  }
  if (provider.auth.mode === "x-api-key") {
    return { [provider.auth.header || "x-api-key"]: apiKey };
  }
  return {};
}

function getPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let cursor: unknown = value;
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

export function modelsUrl(provider: ProviderEntry): string {
  const base = provider.baseURL.trim().replace(/\/+$/, "");
  const path = provider.modelsApi?.path?.trim() || "/models";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ProviderTestResult = {
  ok: boolean;
  status: number | null;
  message: string;
  modelIds: string[];
};

function networkMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return `无法连接：${text}`;
}

/**
 * 探测 Provider：带上配置的鉴权信息请求 `GET <baseURL><modelsApi.path>`。
 * 2xx 视为成功；401/403 为鉴权失败；404 表示“端点可达但厂商不提供模型列表”；
 * 其他状态码会附带响应片段返回，方便用户定位问题。
 */
export async function testProviderConnection(
  provider: ProviderEntry,
  apiKey: string | null,
): Promise<ProviderTestResult> {
  if (!provider.baseURL.trim()) {
    return {
      ok: false,
      status: null,
      message: "Base URL 为空，请先填写接口地址。",
      modelIds: [],
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await resolveProviderFetch(provider.baseURL)(modelsUrl(provider), {
      method: "GET",
      headers: {
        ...provider.headers,
        ...authHeaders(provider, apiKey),
      },
      signal: controller.signal,
    });
    const bodyText = await response.text().catch(() => "");
    if (response.ok) {
      const ids = parseModelIds(bodyText, provider.modelsApi);
      return {
        ok: true,
        status: response.status,
        message:
          ids.length > 0
            ? `连接成功，发现 ${ids.length} 个模型。`
            : "连接成功（接口未返回可识别的模型列表）。",
        modelIds: ids,
      };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: response.status,
        message: `鉴权失败（HTTP ${response.status}），请检查 API Key。`,
        modelIds: [],
      };
    }
    if (response.status === 404) {
      return {
        ok: true,
        status: response.status,
        message:
          "端点可达，但该厂商不提供模型列表接口（HTTP 404）——请手动添加模型。",
        modelIds: [],
      };
    }
    const snippet = bodyText.replace(/\s+/g, " ").slice(0, 240);
    return {
      ok: false,
      status: response.status,
      message: `请求失败（HTTP ${response.status}）${snippet ? `：${snippet}` : ""}`,
      modelIds: [],
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      message: networkMessage(error),
      modelIds: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseModelIds(
  bodyText: string,
  api: ModelsApiConfig | null,
): string[] {
  try {
    const json: unknown = JSON.parse(bodyText);
    const items = api?.itemsPath ? getPath(json, api.itemsPath) : json;
    const list = Array.isArray(items) ? items : [];
    const idPath = api?.idPath || "id";
    return list
      .map((item) => getPath(item, idPath))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export type FetchedModel = { id: string; label: string };

/** 拉取 Provider 的模型列表。失败时抛出可直接展示给用户的错误信息。 */
export async function fetchProviderModels(
  provider: ProviderEntry,
  apiKey: string | null,
): Promise<FetchedModel[]> {
  const result = await testProviderConnection(provider, apiKey);
  if (!result.ok) throw new Error(result.message);
  if (result.modelIds.length === 0) {
    throw new Error(result.message);
  }
  // 模型 ID 先作为显示名，用户添加后可自行重命名。
  return result.modelIds.map((id) => ({ id, label: id }));
}
