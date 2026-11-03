import type {
  AiConfig,
  EffortConfig,
  EffortLevel,
  ProviderEntry,
} from "./types";

/**
 * 内置目录：首次启动时用于播种 `terax-ai-models.json`，同时填充“添加 Provider”菜单。
 * 这里只有厂商元数据，没有任何模型。模型行始终由用户创建——要么从厂商的
 * `/models` 接口拉取，要么手动填写模型 ID。
 *
 * 职责分工：`params` 放每次请求都携带的自定义请求体参数（如 frequency_penalty）；
 * `effort` 放思考强度档位（一个参数名 + 每档一个实际取值）。
 */

function ladder(
  path: string,
  offLabel: string,
  levels: EffortLevel[],
  fallback: string,
): EffortConfig {
  return { path, offLabel, levels, default: fallback };
}

const OFF = "关闭";

/**
 * `reasoning_effort` 阶梯：`null` 表示整键省略——厂商不接受 `"none"`、
 * 只能通过省略参数来关闭思考。
 */
const GLM_53_EFFORT = ladder(
  "reasoning_effort",
  OFF,
  [
    { id: "off", label: OFF, value: null },
    { id: "low", label: "低", value: "low" },
    { id: "high", label: "高", value: "high" },
    { id: "max", label: "最高", value: "max" },
  ],
  "high",
);

/** GLM-5.2：比 5.3 多一个“中”档，作为模型级覆盖的参考示例导出。 */
export const GLM_52_EFFORT_EXAMPLE = ladder(
  "reasoning_effort",
  OFF,
  [
    { id: "off", label: OFF, value: null },
    { id: "low", label: "低", value: "low" },
    { id: "medium", label: "中", value: "medium" },
    { id: "high", label: "高", value: "high" },
    { id: "xhigh", label: "极高", value: "xhigh" },
  ],
  "high",
);

/** Qwen3 混合思考模型：OpenAI 兼容模式下用布尔开关控制是否思考。 */
const QWEN_EFFORT = ladder(
  "enable_thinking",
  OFF,
  [
    { id: "off", label: OFF, value: false },
    { id: "on", label: "开启", value: true },
  ],
  "on",
);

/** 豆包（方舟）提供 disabled / auto / enabled 三态。 */
const DOUBAO_EFFORT = ladder(
  "thinking.type",
  OFF,
  [
    { id: "off", label: OFF, value: "disabled" },
    { id: "auto", label: "自动", value: "auto" },
    { id: "on", label: "开启", value: "enabled" },
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
    params: [],
    effort: GLM_53_EFFORT,
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
    effort: null,
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
    params: [],
    effort: QWEN_EFFORT,
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
    effort: null,
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
    params: [],
    effort: DOUBAO_EFFORT,
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
    effort: null,
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
    effort: null,
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
    effort: null,
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
    params: [],
    effort: null,
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
    effort: null,
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
    effort: null,
    models: [],
    icon: "plug",
    builtin: true,
  },
];

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
