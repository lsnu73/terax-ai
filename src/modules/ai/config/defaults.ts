import type {
  AiConfig,
  ParamDef,
  ProviderEntry,
  ThinkingConfig,
} from "./types";

/**
 * 内置目录：首次启动时用于播种 `terax-ai-models.json`，同时填充“添加 Provider”菜单。
 * 这里只有厂商元数据，没有任何模型。模型行始终由用户创建——要么从厂商的
 * `/models` 接口拉取，要么手动填写模型 ID。
 */

function param(
  key: string,
  type: ParamDef["type"],
  extra: Partial<ParamDef> = {},
): ParamDef {
  return {
    key,
    label: key,
    location: "body",
    path: key,
    type,
    enabled: true,
    ...extra,
  };
}

function ladder(
  offLabel: string,
  levels: ThinkingConfig["levels"],
  fallback: string,
): ThinkingConfig {
  return { offLabel, levels, default: fallback };
}

/** `thinking: { type: "enabled" | "disabled" }` —— 智谱等厂商的通用形态。 */
const THINKING_MODE = param("thinking.type", "string", {
  label: "Thinking mode",
  path: "thinking.type",
  enum: ["enabled", "disabled", "auto"],
});

/**
 * 带厂商归一化的 `reasoning_effort`。映射为 `null` 表示整键省略：
 * `none`/`minimal` 变为“不发送”，`xhigh` 收敛到 `max`，
 * 其余中间档位收敛到最接近的受支持取值。
 */
const REASONING_EFFORT = param("reasoning_effort", "string", {
  label: "Reasoning effort",
  enum: ["none", "minimal", "low", "medium", "high", "xhigh", "max"],
  map: {
    none: null,
    minimal: null,
    low: "low",
    medium: "high",
    high: "high",
    xhigh: "max",
    max: "max",
  },
});

/** GLM-5.3 / GLM-5.3-Flash：只接受 low / high / max。 */
const GLM_53_THINKING = ladder(
  "关闭",
  [
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
      id: "high",
      label: "高",
      values: { "thinking.type": "enabled", reasoning_effort: "high" },
    },
    {
      id: "max",
      label: "最高",
      values: { "thinking.type": "enabled", reasoning_effort: "max" },
    },
  ],
  "high",
);

/** GLM-5.2：low/medium 收敛为 high，xhigh 收敛为 max。 */
const GLM_52_THINKING = ladder(
  "关闭",
  [
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
  "high",
);

/** Qwen3 混合思考模型：布尔开关 + token 预算。 */
const QWEN_THINKING = ladder(
  "关闭",
  [
    {
      id: "off",
      label: "关闭",
      values: { enable_thinking: false, thinking_budget: null },
    },
    {
      id: "low",
      label: "低",
      values: { enable_thinking: true, thinking_budget: 1024 },
    },
    {
      id: "medium",
      label: "中",
      values: { enable_thinking: true, thinking_budget: 4096 },
    },
    {
      id: "high",
      label: "高",
      values: { enable_thinking: true, thinking_budget: 8192 },
    },
  ],
  "medium",
);

/** 豆包（方舟）提供 enabled / disabled / auto 三态。 */
const DOUBAO_THINKING = ladder(
  "关闭",
  [
    {
      id: "off",
      label: "关闭",
      values: { "thinking.type": "disabled" },
    },
    {
      id: "auto",
      label: "自动",
      values: { "thinking.type": "auto" },
    },
    {
      id: "on",
      label: "开启",
      values: { "thinking.type": "enabled" },
    },
  ],
  "auto",
);

const PROVIDERS: ProviderEntry[] = [
  {
    id: "zhipu",
    label: "智谱 GLM",
    protocol: "openai-compatible",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    consoleUrl: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
    keyringAccount: "zhipu-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    // 智谱的兼容端点不提供模型列表接口。
    modelsApi: null,
    params: [THINKING_MODE, REASONING_EFFORT],
    thinking: GLM_53_THINKING,
    models: [],
    icon: "brain",
    builtin: true,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    protocol: "openai-compatible",
    baseURL: "https://api.deepseek.com/v1",
    consoleUrl: "https://platform.deepseek.com/api_keys",
    keyringAccount: "deepseek-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [],
    thinking: null,
    models: [],
    icon: "deepseek",
    builtin: true,
  },
  {
    id: "dashscope",
    label: "阿里云百炼 Qwen",
    protocol: "openai-compatible",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    consoleUrl: "https://bailian.console.aliyun.com/?apiKey=1",
    keyringAccount: "dashscope-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [
      param("enable_thinking", "boolean", {
        label: "Enable thinking",
        default: false,
      }),
      param("thinking_budget", "number", { label: "Thinking budget" }),
    ],
    thinking: QWEN_THINKING,
    models: [],
    icon: "globe",
    builtin: true,
  },
  {
    id: "moonshot",
    label: "月之暗面 Kimi",
    protocol: "openai-compatible",
    baseURL: "https://api.moonshot.cn/v1",
    consoleUrl: "https://platform.moonshot.cn/console/api-keys",
    keyringAccount: "moonshot-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [],
    thinking: null,
    models: [],
    icon: "globe",
    builtin: true,
  },
  {
    id: "volcengine",
    label: "火山方舟 豆包",
    protocol: "openai-compatible",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    consoleUrl:
      "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    keyringAccount: "volcengine-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    // 方舟的模型 ID 通常是部署端点（`ep-...`），没有可靠的公开列表，
    // 需要用户从方舟控制台复制后手动添加。
    modelsApi: null,
    params: [THINKING_MODE],
    thinking: DOUBAO_THINKING,
    models: [],
    icon: "flash",
    builtin: true,
  },
  {
    id: "siliconflow",
    label: "硅基流动 SiliconFlow",
    protocol: "openai-compatible",
    baseURL: "https://api.siliconflow.cn/v1",
    consoleUrl: "https://cloud.siliconflow.cn/account/ak",
    keyringAccount: "siliconflow-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [],
    thinking: null,
    models: [],
    icon: "server",
    builtin: true,
  },
  {
    id: "minimax",
    label: "MiniMax",
    protocol: "openai-compatible",
    baseURL: "https://api.minimax.chat/v1",
    consoleUrl:
      "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    keyringAccount: "minimax-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: null,
    params: [],
    thinking: null,
    models: [],
    icon: "cpu",
    builtin: true,
  },
  {
    id: "stepfun",
    label: "阶跃星辰 StepFun",
    protocol: "openai-compatible",
    baseURL: "https://api.stepfun.com/v1",
    consoleUrl: "https://platform.stepfun.com/interface-key",
    keyringAccount: "stepfun-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [],
    thinking: null,
    models: [],
    icon: "cpu",
    builtin: true,
  },
  {
    id: "hunyuan",
    label: "腾讯混元",
    protocol: "openai-compatible",
    baseURL: "https://api.hunyuan.cloud.tencent.com/v1",
    consoleUrl: "https://console.cloud.tencent.com/hunyuan/api-key",
    keyringAccount: "hunyuan-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [param("enable_thinking", "boolean", { label: "Enable thinking" })],
    thinking: null,
    models: [],
    icon: "globe",
    builtin: true,
  },
  {
    id: "qianfan",
    label: "百度千帆",
    protocol: "openai-compatible",
    baseURL: "https://qianfan.baidubce.com/v2",
    consoleUrl:
      "https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application",
    keyringAccount: "qianfan-api-key",
    auth: { mode: "bearer", required: true },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [],
    thinking: null,
    models: [],
    icon: "globe",
    builtin: true,
  },
  {
    id: "custom",
    label: "自定义 / 本地 (OpenAI 兼容)",
    protocol: "openai-compatible",
    baseURL: "",
    keyringAccount: "custom-api-key",
    auth: { mode: "bearer", required: false },
    headers: {},
    modelsApi: { path: "/models", itemsPath: "data", idPath: "id" },
    params: [],
    thinking: null,
    models: [],
    icon: "plug",
    builtin: true,
  },
];

/** 作为模型级覆盖的参考示例导出：GLM-5.2 模型行可把这段复制到自己的
 *  `thinking` 字段。 */
export const GLM_52_THINKING_EXAMPLE = GLM_52_THINKING;

export function builtinProviders(): ProviderEntry[] {
  return structuredClone(PROVIDERS);
}

export function defaultAiConfig(): AiConfig {
  return {
    version: 1,
    defaults: { modelId: "" },
    providers: builtinProviders(),
  };
}

export const BUILTIN_PROVIDER_IDS = PROVIDERS.map((p) => p.id);
