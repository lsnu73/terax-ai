import { invoke } from "@tauri-apps/api/core";
import { t } from "@/modules/i18n";
import {
  allKeyringAccounts,
  findProvider,
  providerSupportsKey,
} from "../config";

/**
 * API Key 存放在操作系统钥匙串，绝不写入 JSON 配置文件。
 * 账户名是每个 Provider 配置的一部分（`keyringAccount`），
 * 因此新增 Provider 不需要改代码。
 */
export const KEYRING_SERVICE = "terax-ai";

export type ProviderKeys = Record<string, string | null>;

export const EMPTY_PROVIDER_KEYS: ProviderKeys = {};

async function getByAccount(account: string): Promise<string | null> {
  if (!account) return null;
  try {
    const value = await invoke<string | null>("secrets_get", {
      service: KEYRING_SERVICE,
      account,
    });
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function getAllByAccount(
  accounts: readonly string[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (accounts.length === 0) return out;
  try {
    const results = await invoke<(string | null)[]>("secrets_get_all", {
      service: KEYRING_SERVICE,
      accounts: [...accounts],
    });
    accounts.forEach((account, index) => {
      const value = results[index];
      out.set(account, value && value.length > 0 ? value : null);
    });
    return out;
  } catch {
    for (const account of accounts)
      out.set(account, await getByAccount(account));
    return out;
  }
}

export async function getKey(providerId: string): Promise<string | null> {
  const provider = findProvider(providerId);
  if (!provider || !providerSupportsKey(provider)) return null;
  return getByAccount(provider.keyringAccount);
}

export async function setKey(providerId: string, key: string): Promise<void> {
  const provider = findProvider(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!providerSupportsKey(provider)) {
    throw new Error(t("ai.keyring.noKeyUsed", { provider: provider.label }));
  }
  const trimmed = key.trim();
  if (!trimmed) throw new Error(t("ai.keyring.emptyKey"));
  await invoke("secrets_set", {
    service: KEYRING_SERVICE,
    account: provider.keyringAccount,
    password: trimmed,
  });
}

export async function clearKey(providerId: string): Promise<void> {
  const provider = findProvider(providerId);
  if (!provider) return;
  try {
    await invoke("secrets_delete", {
      service: KEYRING_SERVICE,
      account: provider.keyringAccount,
    });
  } catch {
    // 本来就不存在——忽略
  }
}

/** 所有已配置 Provider 的密钥。 */
export async function getAllKeys(): Promise<ProviderKeys> {
  const providers = allKeyringAccounts();
  const values = await getAllByAccount(providers.map((p) => p.account));
  const out: ProviderKeys = {};
  for (const { providerId, account } of providers) {
    out[providerId] = values.get(account) ?? null;
  }
  return out;
}
