import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiConfig } from "./types";

const storage = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  class LazyStore {
    reload = vi.fn(async () => {});
    entries = vi.fn(async () => [...data.entries()]);
    set = vi.fn(async (key: string, value: unknown) => {
      data.set(key, value);
    });
    delete = vi.fn(async (key: string) => {
      data.delete(key);
    });
    save = vi.fn(async () => {});
  }
  return { data, LazyStore };
});

vi.mock("@tauri-apps/plugin-store", () => ({ LazyStore: storage.LazyStore }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(async () => {}),
  listen: vi.fn(async () => vi.fn()),
}));

async function loadModule() {
  vi.resetModules();
  return import("@/modules/ai/config/persist");
}

function config(overrides: Partial<AiConfig> = {}): AiConfig {
  return {
    version: 1,
    defaults: { modelId: "" },
    providers: [],
    ...overrides,
  };
}

beforeEach(() => {
  storage.data.clear();
  vi.clearAllMocks();
});

describe("AI config persistence", () => {
  it("creates a new config with no providers", async () => {
    const { readAiConfig } = await loadModule();

    const loaded = await readAiConfig();

    expect(loaded.seeded).toBe(true);
    expect(loaded.config.providers).toEqual([]);
    expect(loaded.config.defaults.modelId).toBe("");
    expect(storage.data.get("providers")).toEqual([]);
  });

  it("round-trips system and commit message prompt overrides", async () => {
    const { readAiConfig, writeAiConfig } = await loadModule();
    await writeAiConfig(
      config({
        prompts: {
          full: "custom full prompt",
          lite: "custom lite prompt",
          custom: "custom prompt",
        },
        commitMessagePrompt: "custom commit prompt",
      }),
    );

    const loaded = await readAiConfig();

    expect(loaded.config.prompts).toEqual({
      full: "custom full prompt",
      lite: "custom lite prompt",
      custom: "custom prompt",
    });
    expect(loaded.config.commitMessagePrompt).toBe("custom commit prompt");
  });

  it("deletes old prompt overrides when defaults are restored", async () => {
    const { readAiConfig, writeAiConfig } = await loadModule();
    await writeAiConfig(
      config({
        prompts: { full: "custom full prompt" },
        commitMessagePrompt: "custom commit prompt",
      }),
    );

    await writeAiConfig(config());
    const loaded = await readAiConfig();

    expect(storage.data.has("prompts")).toBe(false);
    expect(storage.data.has("commitMessagePrompt")).toBe(false);
    expect(loaded.config.prompts).toBeUndefined();
    expect(loaded.config.commitMessagePrompt).toBeUndefined();
  });

  it("keeps existing user providers without appending templates", async () => {
    storage.data.set("version", 1);
    storage.data.set("defaults", { modelId: "custom-model" });
    storage.data.set("providers", [
      {
        id: "custom",
        baseURL: "https://example.test/v1",
        models: [{ id: "custom-model" }],
      },
    ]);
    const { readAiConfig } = await loadModule();

    const loaded = await readAiConfig();

    expect(loaded.seeded).toBe(false);
    expect(loaded.config.providers).toHaveLength(1);
    expect(loaded.config.providers[0].id).toBe("custom");
    expect(loaded.config.providers[0].models[0].id).toBe("custom-model");
    expect(loaded.config.defaults.modelId).toBe("custom-model");
  });
});
