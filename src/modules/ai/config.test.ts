import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultAiConfig,
  getModelContextLimit,
  normalizeAiConfig,
  providerNeedsKey,
  resolveModel,
  resolveRequestParams,
  setAiConfig,
  thinkingLevels,
  tryResolveModel,
  type AiConfig,
  type ModelEntry,
  type ProviderEntry,
} from "./config";

const PARAMS = [
  {
    key: "thinking.type",
    location: "body" as const,
    path: "thinking.type",
    type: "string" as const,
    enum: ["enabled", "disabled"],
    enabled: true,
  },
  {
    key: "reasoning_effort",
    location: "body" as const,
    path: "reasoning_effort",
    type: "string" as const,
    enabled: true,
    map: {
      none: null,
      minimal: null,
      low: "low",
      medium: "high",
      high: "high",
      xhigh: "max",
      max: "max",
    },
  },
];

const THINKING = {
  default: "high",
  offLabel: "关闭",
  levels: [
    {
      id: "off",
      label: "关闭",
      values: { "thinking.type": "disabled", reasoning_effort: "none" },
    },
    {
      id: "low",
      label: "低",
      values: { "thinking.type": "enabled", reasoning_effort: "low" },
    },
    {
      id: "medium",
      label: "中",
      values: { "thinking.type": "enabled", reasoning_effort: "medium" },
    },
    {
      id: "high",
      label: "高",
      values: { "thinking.type": "enabled", reasoning_effort: "high" },
    },
    {
      id: "xhigh",
      label: "极高",
      values: { "thinking.type": "enabled", reasoning_effort: "xhigh" },
    },
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
    thinking: null,
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
    thinking: THINKING,
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

  it("declares thinking ladders on providers, not in code", () => {
    const seeded = defaultAiConfig();
    const zhipu = seeded.providers.find((p) => p.id === "zhipu");
    expect(zhipu?.thinking?.levels.map((l) => l.id)).toEqual([
      "off",
      "low",
      "high",
      "max",
    ]);
    const dashscope = seeded.providers.find((p) => p.id === "dashscope");
    expect(dashscope?.params.map((p) => p.key)).toContain("thinking_budget");
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

  it("drops thinking configs with no levels", () => {
    const result = normalizeAiConfig({
      providers: [
        { id: "p", thinking: { default: "x", levels: [] }, models: [] },
      ],
    });
    expect(result.config.providers[0].thinking).toBeNull();
  });
});

describe("resolveRequestParams", () => {
  beforeEach(() => {
    setAiConfig(config([provider()]));
  });

  it("maps GLM notches through the declared map", () => {
    const p = provider();
    const m = p.models[0];
    expect(resolveRequestParams(p, m, "high").body).toEqual({
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    });
    expect(resolveRequestParams(p, m, "medium").body.reasoning_effort).toBe(
      "high",
    );
    expect(resolveRequestParams(p, m, "xhigh").body.reasoning_effort).toBe(
      "max",
    );
  });

  it("omits mapped-to-null values when thinking is off", () => {
    const p = provider();
    const body = resolveRequestParams(p, p.models[0], "off").body;
    expect(body).toEqual({ thinking: { type: "disabled" } });
    expect("reasoning_effort" in body).toBe(false);
  });

  it("falls back to the model default notch", () => {
    const p = provider();
    const body = resolveRequestParams(p, p.models[0]).body;
    expect(body.reasoning_effort).toBe("high");
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

  it("writes header parameters and keeps the wire name", () => {
    const p = provider({
      params: [
        {
          key: "x-thinking",
          location: "header",
          path: "X-Thinking",
          type: "string",
          enabled: true,
        },
      ],
      thinking: {
        default: "on",
        levels: [
          { id: "off", label: "off", values: { "x-thinking": null } },
          { id: "on", label: "on", values: { "x-thinking": "enabled" } },
        ],
      },
    });
    expect(resolveRequestParams(p, p.models[0], "on").headers).toEqual({
      "X-Thinking": "enabled",
    });
  });

  it("supports a boolean switch plus a numeric budget", () => {
    const p = provider({
      params: [
        {
          key: "enable_thinking",
          location: "body",
          path: "enable_thinking",
          type: "boolean",
          enabled: true,
        },
        {
          key: "thinking_budget",
          location: "body",
          path: "thinking_budget",
          type: "number",
          enabled: true,
        },
      ],
      thinking: {
        default: "low",
        levels: [
          {
            id: "off",
            label: "off",
            values: { enable_thinking: false, thinking_budget: null },
          },
          {
            id: "low",
            label: "low",
            values: { enable_thinking: true, thinking_budget: 1024 },
          },
        ],
      },
    });
    expect(resolveRequestParams(p, p.models[0], "low").body).toEqual({
      enable_thinking: true,
      thinking_budget: 1024,
    });
    expect(resolveRequestParams(p, p.models[0], "off").body).toEqual({
      enable_thinking: false,
    });
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

  it("reads the thinking ladder from the model before the provider", () => {
    const p = provider();
    const m = model({
      thinking: {
        default: "only",
        levels: [{ id: "only", label: "唯一", values: {} }],
      },
    });
    expect(thinkingLevels(p, m).map((l) => l.id)).toEqual(["only"]);
    expect(thinkingLevels(p, p.models[0]).map((l) => l.id)).toContain("medium");
  });
});
