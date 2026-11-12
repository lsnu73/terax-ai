import type { AiConfig } from "./types";

/**
 * Renames a provider without touching its keychain account or nested models.
 *
 * `keyringAccount` is intentionally preserved: it is the lookup key for the
 * provider's existing secret, so deriving it from the new ID would orphan the
 * saved API key. Other consumers keep the provider identity only in the ID,
 * so the rest of the entry can be copied as-is.
 */
export type ProviderRenameResult =
  | { config: AiConfig; changed: boolean }
  | { error: "empty" | "duplicate" | "unknown" };

export function renameProvider(
  config: AiConfig,
  providerId: string,
  nextId: string,
): ProviderRenameResult {
  const trimmed = nextId.trim();
  if (!trimmed) return { error: "empty" };
  if (!config.providers.some((provider) => provider.id === providerId)) {
    return { error: "unknown" };
  }
  if (trimmed === providerId) return { config, changed: false };
  if (config.providers.some((provider) => provider.id === trimmed)) {
    return { error: "duplicate" };
  }
  return {
    config: {
      ...config,
      providers: config.providers.map((provider) =>
        provider.id === providerId ? { ...provider, id: trimmed } : provider,
      ),
    },
    changed: true,
  };
}
