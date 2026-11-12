import { describe, expect, it } from "vitest";
import { builtinProviders, defaultAiConfig } from "./defaults";
import { renameProvider } from "./providerRename";
import type { AiConfig, ModelEntry, ProviderEntry } from "./types";

const model: ModelEntry = {
  id: "deepseek-chat",
  label: "DeepSeek Chat",
  inputTokens: 128_000,
  outputTokens: 8_192,
  supportsTemperature: true,
  supportsAutocomplete: true,
  params: [],
  effort: null,
  extra: {},
  tags: [],
};

function template(id: string): ProviderEntry {
  const provider = builtinProviders().find((item) => item.id === id);
  if (!provider) throw new Error(`Missing builtin provider: ${id}`);
  return provider;
}

function config(): AiConfig {
  return {
    ...defaultAiConfig(),
    defaults: { modelId: model.id },
    providers: [
      { ...template("deepseek"), models: [model] },
      {
        ...template("custom"),
        id: "other",
        label: "Other",
        keyringAccount: "other-api-key",
      },
    ],
  };
}

describe("renameProvider", () => {
  it("changes only the id and preserves the keychain account and models", () => {
    const before = config();
    const result = renameProvider(before, "deepseek", "primary");
    if ("error" in result) throw new Error(result.error);

    const renamed = result.config.providers.find(
      (provider) => provider.id === "primary",
    );
    expect(result.changed).toBe(true);
    expect(renamed).toMatchObject({
      id: "primary",
      label: "DeepSeek",
      keyringAccount: "deepseek-api-key",
      models: [model],
    });
    expect(result.config.providers[1].id).toBe("other");
    expect(result.config.defaults).toEqual(before.defaults);
    expect(before.providers[0].id).toBe("deepseek");
  });

  it("trims surrounding whitespace from the new id", () => {
    const result = renameProvider(config(), "deepseek", "  primary  ");
    if ("error" in result) throw new Error(result.error);
    expect(result.config.providers[0].id).toBe("primary");
  });

  it("treats the current id as a no-op", () => {
    const before = config();
    const result = renameProvider(before, "deepseek", "deepseek");
    if ("error" in result) throw new Error(result.error);
    expect(result.changed).toBe(false);
    expect(result.config).toBe(before);
  });

  it("rejects empty, duplicate and unknown ids without changing the config", () => {
    const before = config();
    for (const [nextId, error] of [
      ["  ", "empty"],
      ["other", "duplicate"],
      ["deepseek", "unknown"],
    ] as const) {
      const result =
        error === "unknown"
          ? renameProvider(before, "missing", nextId)
          : renameProvider(before, "deepseek", nextId);
      expect(result).toEqual({ error });
    }
    expect(before.providers.map((provider) => provider.id)).toEqual([
      "deepseek",
      "other",
    ]);
  });
});
