import { beforeEach, describe, expect, it } from "vitest";
import {
  type AiConfig,
  builtinSystemPrompt,
  defaultAiConfig,
  getModelContextLimit,
  type ModelEntry,
  normalizeAiConfig,
  type ProviderEntry,
  providerNeedsKey,
  resolveModel,
  resolveRequestParams,
  selectSystemPromptForModel,
  setAiConfig,
  systemPromptKind,
  TOOL_PROTOCOL_TAIL,
  effortLevels,
  tryResolveModel,
} from "./config";

const PARAMS = [
  {
    key: "frequency_penalty",
    label: "频率惩罚",
    value: 0.5,
    enabled: true,
  },
];

const EFFORT = {
  path: "reasoning_effort",
  default: "high",
  offLabel: "关闭",
  levels: [
    { id: "off", label: "关闭", value: null },
    { id: "low", label: "低", value: "low" },
    { id: "high", label: "高", value: "high" },
    { id: "max", label: "最高", value: "max" },
  ],
};

function model(overrides: Partial<ModelEntry> = {}): ModelEntry {
  return {
    id: "glm-test",
    label: "GLM Test",
    inputTokens: 200_000,
    outputTokens: 8_192,
    supportsTemperature: true,
    supportsAutocomplete: true,
    systemPrompt: "full",
    params: [],
    effort: null,
    extra: {},
    tags: [],
    ...overrides,
  };
}

function provider(overrides: Partial<ProviderEntry> = {}): ProviderEntry {
  return {
    id: "zhipu",
    label: "智谱 GLM",
    protocol: "openai-compatible",
    baseURL: "https://example.test/v4",
    keyringAccount: "zhipu-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: null,
    params: PARAMS,
    effort: EFFORT,
    models: [model()],
    icon: "brain",
    builtin: true,
    ...overrides,
  };
}

function config(providers: ProviderEntry[]): AiConfig {
  return {
    version: 1,
    defaults: { modelId: providers[0]?.models[0]?.id ?? "" },
    providers,
  };
}

describe("built-in catalog", () => {
  it("seeds domestic providers only, without a hardcoded model list", () => {
    const seeded = defaultAiConfig();
    const ids = seeded.providers.map((p) => p.id);
    expect(ids).toContain("zhipu");
    expect(ids).toContain("deepseek");
    expect(ids).toContain("dashscope");
    expect(ids).toContain("moonshot");
    expect(ids).not.toContain("openai");
    expect(ids).not.toContain("anthropic");
    expect(ids).not.toContain("google");
    expect(seeded.providers.every((p) => p.models.length === 0)).toBe(true);
    expect(seeded.defaults.modelId).toBe("");
  });

  it("declares effort ladders on providers, not in code", () => {
    const seeded = defaultAiConfig();
    const zhipu = seeded.providers.find((p) => p.id === "zhipu");
    expect(zhipu?.effort?.path).toBe("reasoning_effort");
    expect(zhipu?.effort?.levels.map((l) => l.id)).toEqual([
      "off",
      "low",
      "high",
      "max",
    ]);
    const doubao = seeded.providers.find((p) => p.id === "volcengine");
    expect(doubao?.effort?.path).toBe("thinking.type");
  });
});

describe("normalizeAiConfig", () => {
  it("fills defaults and de-duplicates ids", () => {
    const result = normalizeAiConfig({
      providers: [
        { id: "p1", models: [{ id: "m1" }, { id: "m1" }] },
        { id: "p1" },
      ],
    });
    expect(result.config.providers).toHaveLength(1);
    expect(result.config.providers[0].models).toHaveLength(1);
    expect(result.config.providers[0].keyringAccount).toBe("p1-api-key");
    expect(result.config.providers[0].models[0].inputTokens).toBe(128_000);
    expect(result.config.defaults.modelId).toBe("m1");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("keeps a deliberately empty provider list empty", () => {
    const result = normalizeAiConfig({ providers: [] });
    expect(result.config.providers).toHaveLength(0);
    expect(result.config.defaults.modelId).toBe("");
  });

  it("never carries API keys in static headers", () => {
    const result = normalizeAiConfig({
      providers: [
        {
          id: "p",
          headers: {
            Authorization: "Bearer sk-secret",
            "x-api-key": "secret",
            "X-Title": "Terax",
          },
          models: [],
        },
      ],
    });
    expect(result.config.providers[0].headers).toEqual({ "X-Title": "Terax" });
    expect(result.warnings).toHaveLength(2);
  });

  it("drops effort configs with no levels", () => {
    const result = normalizeAiConfig({
      providers: [
        { id: "p", effort: { path: "x", default: "x", levels: [] }, models: [] },
      ],
    });
    expect(result.config.providers[0].effort).toBeNull();
  });

  it("migrates a single-key legacy thinking config to the effort format", () => {
    const result = normalizeAiConfig({
      providers: [
        {
          id: "p",
          thinking: {
            default: "high",
            offLabel: "关闭",
            levels: [
              { id: "off", label: "关闭", values: { reasoning_effort: null } },
              { id: "high", label: "高", values: { reasoning_effort: "high" } },
            ],
          },
          models: [],
        },
      ],
    });
    expect(result.config.providers[0].effort).toEqual({
      path: "reasoning_effort",
      default: "high",
      offLabel: "关闭",
      levels: [
        { id: "off", label: "关闭", value: null },
        { id: "high", label: "高", value: "high" },
      ],
    });
  });

  it("drops a multi-key legacy thinking config with a warning", () => {
    const result = normalizeAiConfig({
      providers: [
        {
          id: "p",
          thinking: {
            levels: [
              {
                id: "off",
                label: "off",
                values: { "thinking.type": "disabled", reasoning_effort: null },
              },
              {
                id: "on",
                label: "on",
                values: { "thinking.type": "enabled", reasoning_effort: "low" },
              },
            ],
          },
          models: [],
        },
      ],
    });
    expect(result.config.providers[0].effort).toBeNull();
    expect(
      result.warnings.some((w) => w.includes("Legacy thinking config")),
    ).toBe(true);
  });

  it("migrates legacy params: keeps body params with a value, drops the rest", () => {
    const result = normalizeAiConfig({
      providers: [
        {
          id: "p",
          params: [
            { key: "frequency_penalty", location: "body", path: "frequency_penalty", type: "number", default: 0.5, enabled: true },
            { key: "reasoning_effort", location: "body", path: "reasoning_effort", type: "string", enum: ["low", "high"], map: { low: "low" }, enabled: true },
            { key: "x-thing", location: "header", path: "X-Thing", type: "string", default: "v", enabled: true },
          ],
          models: [],
        },
      ],
    });
    expect(result.config.providers[0].params).toEqual([
      { key: "frequency_penalty", label: "frequency_penalty", value: 0.5, enabled: true },
    ]);
  });

  it("keeps valid systemPrompt kinds at all levels and drops invalid ones", () => {
    const result = normalizeAiConfig({
      defaults: { modelId: "m1", systemPrompt: "lite" },
      providers: [
        {
          id: "p",
          systemPrompt: "custom",
          models: [
            { id: "m1", systemPrompt: "full" },
            { id: "m2", systemPrompt: "nonsense" },
          ],
        },
      ],
    });
    expect(result.config.defaults.systemPrompt).toBe("lite");
    expect(result.config.providers[0].systemPrompt).toBe("custom");
    expect(result.config.providers[0].models[0].systemPrompt).toBe("full");
    expect(result.config.providers[0].models[1].systemPrompt).toBeUndefined();
  });

  it("parses prompt text overrides and drops empty ones", () => {
    const result = normalizeAiConfig({
      providers: [{ id: "p", models: [{ id: "m1" }] }],
      prompts: { full: "  hello  ", lite: "", custom: "mine" },
    });
    expect(result.config.prompts).toEqual({
      full: "  hello  ",
      custom: "mine",
    });

    const empty = normalizeAiConfig({
      providers: [{ id: "p", models: [{ id: "m1" }] }],
      prompts: { full: "   " },
    });
    expect(empty.config.prompts).toBeUndefined();
  });
});

describe("resolveRequestParams", () => {
  beforeEach(() => {
    setAiConfig(config([provider()]));
  });

  it("sends custom params on every request", () => {
    const p = provider();
    const m = p.models[0];
    expect(resolveRequestParams(p, m, "high").body).toEqual({
      frequency_penalty: 0.5,
      reasoning_effort: "high",
    });
  });

  it("omits the effort key when the level value is null", () => {
    const p = provider();
    const body = resolveRequestParams(p, p.models[0], "off").body;
    expect(body).toEqual({ frequency_penalty: 0.5 });
    expect("reasoning_effort" in body).toBe(false);
  });

  it("falls back to the model default level", () => {
    const p = provider();
    const body = resolveRequestParams(p, p.models[0]).body;
    expect(body.reasoning_effort).toBe("high");
  });

  it("lets a model override a provider param by key", () => {
    const p = provider();
    const m = model({
      params: [
        { key: "frequency_penalty", label: "x", value: 0, enabled: true },
      ],
    });
    expect(resolveRequestParams(p, m, "off").body).toEqual({
      frequency_penalty: 0,
    });
  });

  it("skips a disabled param", () => {
    const p = provider({
      params: [
        { key: "frequency_penalty", value: 0.5, enabled: false },
      ],
    });
    expect(resolveRequestParams(p, p.models[0], "off").body).toEqual({});
  });

  it("merges the raw extra overlay last", () => {
    const p = provider();
    const m = model({ extra: { stream_options: { include_usage: true } } });
    const body = resolveRequestParams(p, m, "low").body;
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it("never overrides transport-owned keys", () => {
    const p = provider();
    const m = model({
      extra: { model: "hijack", stream: false, messages: [] },
    });
    const resolved = resolveRequestParams(p, m, "off");
    expect("model" in resolved.body).toBe(false);
    expect("stream" in resolved.body).toBe(false);
    expect("messages" in resolved.body).toBe(false);
    expect(resolved.warnings.length).toBe(3);
  });

  it("protects transport keys even when nested in a path", () => {
    const p = provider();
    const m = model({ extra: { "messages.0.role": "system" } });
    const resolved = resolveRequestParams(p, m, "off");
    expect("messages" in resolved.body).toBe(false);
    expect(resolved.warnings).toHaveLength(1);
  });

  it("lets a null extra value delete a previously-set key", () => {
    const p = provider();
    const m = model({ extra: { reasoning_effort: null } });
    const body = resolveRequestParams(p, m, "high").body;
    expect("reasoning_effort" in body).toBe(false);
  });

  it("writes nested effort paths and guards protected ones", () => {
    const p = provider({
      params: [],
      effort: {
        path: "thinking.type",
        default: "on",
        levels: [
          { id: "off", label: "off", value: "disabled" },
          { id: "on", label: "on", value: "enabled" },
        ],
      },
    });
    expect(resolveRequestParams(p, p.models[0], "on").body).toEqual({
      thinking: { type: "enabled" },
    });

    const hijack = provider({
      params: [],
      effort: {
        path: "model",
        default: "on",
        levels: [{ id: "on", label: "on", value: "evil" }],
      },
    });
    const resolved = resolveRequestParams(hijack, hijack.models[0], "on");
    expect("model" in resolved.body).toBe(false);
    expect(resolved.warnings.length).toBe(1);
  });
});

describe("system prompt resolution", () => {
  it("resolves the kind through model > provider > global, defaulting to full", () => {
    const bare = model({ systemPrompt: undefined });
    setAiConfig(
      config([provider({ systemPrompt: undefined, models: [bare] })]),
    );
    expect(systemPromptKind("glm-test")).toBe("full");

    setAiConfig({
      ...config([provider({ systemPrompt: undefined, models: [bare] })]),
      defaults: { modelId: "glm-test", systemPrompt: "lite" },
    });
    expect(systemPromptKind("glm-test")).toBe("lite");

    setAiConfig(config([provider({ systemPrompt: "custom", models: [bare] })]));
    expect(systemPromptKind("glm-test")).toBe("custom");

    setAiConfig(
      config([
        provider({
          systemPrompt: "lite",
          models: [model({ systemPrompt: "full" })],
        }),
      ]),
    );
    expect(systemPromptKind("glm-test")).toBe("full");
  });

  it("appends the tool protocol tail to custom prompts", () => {
    const cfg = config([
      provider({ models: [model({ systemPrompt: "custom" })] }),
    ]);
    setAiConfig({ ...cfg, prompts: { custom: "You are a terse helper." } });
    const prompt = selectSystemPromptForModel("glm-test");
    expect(prompt.startsWith("You are a terse helper.")).toBe(true);
    expect(prompt).toContain(TOOL_PROTOCOL_TAIL);
  });

  it("falls back to the builtin full prompt when custom text is empty", () => {
    const cfg = config([
      provider({ models: [model({ systemPrompt: "custom" })] }),
    ]);
    setAiConfig({ ...cfg, prompts: { custom: "   " } });
    expect(selectSystemPromptForModel("glm-test")).toBe(
      builtinSystemPrompt("full"),
    );
  });

  it("prefers user overrides over builtin full/lite text", () => {
    setAiConfig({ ...config([provider()]), prompts: { full: "MY FULL" } });
    expect(selectSystemPromptForModel("glm-test")).toBe("MY FULL");

    const liteCfg = config([
      provider({ models: [model({ systemPrompt: "lite" })] }),
    ]);
    setAiConfig({ ...liteCfg, prompts: { lite: "MY LITE" } });
    expect(selectSystemPromptForModel("glm-test")).toBe("MY LITE");
  });
});

describe("registry helpers", () => {
  it("resolves models configured in JSON", () => {
    setAiConfig(config([provider()]));
    expect(resolveModel("glm-test").provider).toBe("zhipu");
    expect(getModelContextLimit("glm-test")).toBe(200_000);
    expect(tryResolveModel("nope")).toBeNull();
    expect(() => resolveModel("nope")).toThrow();
  });

  it("derives key requirements from auth mode", () => {
    const p = provider({ auth: { mode: "none", required: false } });
    expect(providerNeedsKey(p)).toBe(false);
    expect(providerNeedsKey(provider())).toBe(true);
  });

  it("reads the effort ladder from the model before the provider", () => {
    const p = provider();
    const m = model({
      effort: {
        path: "reasoning_effort",
        default: "only",
        levels: [{ id: "only", label: "唯一", value: "low" }],
      },
    });
    expect(effortLevels(p, m).map((l) => l.id)).toEqual(["only"]);
    expect(effortLevels(p, p.models[0]).map((l) => l.id)).toContain("high");
  });
});
