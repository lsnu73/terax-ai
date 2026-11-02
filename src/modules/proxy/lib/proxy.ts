import type { Preferences, ProxySettings } from "@/modules/settings/store";

export type ProxyScenario = "terminal" | "ai" | "updater";

/** 地址与端口齐全且端口合法时返回代理 URL，否则视为未配置。 */
export function resolveProxyUrl(proxy: ProxySettings): string | null {
  const host = proxy.host.trim();
  const port = proxy.port.trim();
  if (!host || !/^\d{1,5}$/.test(port)) return null;
  const base = /^https?:\/\//i.test(host) ? host : `http://${host}`;
  return `${base}:${port}`;
}

export function proxyForScenario(
  prefs: Preferences,
  scenario: ProxyScenario,
): string | null {
  return prefs.proxy[scenario] ? resolveProxyUrl(prefs.proxy) : null;
}
