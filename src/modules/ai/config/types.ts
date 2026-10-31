/**
 * 可手工编辑的模型配置文件（`terax-ai-models.json`，位于应用数据目录）的数据模型。
 *
 * Provider 调用所需的全部信息都以数据形式放在这里。代码层唯一的开关是
 * `ProviderEntry.protocol`，它选择传输适配器（OpenAI 兼容 / Anthropic / Google）。
 * 因此新增一家国内厂商只是一次纯配置变更。
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/**
 * 自定义请求体参数：每次请求都随请求体发送的高级参数，
 * 例如频率惩罚系数（frequency_penalty）、top_p 等。
 *
 * `key` 是实际发送的键名（点号会创建嵌套对象）；发送值就是 `value`。
 * 想按档位调节思考强度请使用 `EffortConfig`，不要在这里堆思考参数。
 */
export type ParamDef = {
  /** 实际写入请求体的键名；点号会创建嵌套对象。 */
  key: string;
  label?: string;
  /** 每次请求都发送的值；`null` 表示省略该键。 */
  value: JsonValue;
  enabled: boolean;
  description?: string;
};

/** 思考强度滑块的一个档位。索引 0 恒为“关闭”。 */
export type EffortLevel = {
  id: string;
  label: string;
  /** 该档位发送给厂商的实际取值；`null` 表示省略参数（关闭思考）。 */
  value: JsonValue | null;
};

/**
 * 思考强度档位：所有档位共用一个请求体参数名（`path`），
 * 每个档位只负责给出该档位的实际取值。
 */
export type EffortConfig = {
  /** 实际发送的请求体参数名（点号路径），如 reasoning_effort、thinking.type。 */
  path: string;
  /** 用户未选择时使用的档位 id，默认取 levels[0]。 */
  default?: string;
  /** 最左档位的标签，默认“关闭”。 */
  offLabel?: string;
  levels: EffortLevel[];
};

/**
 * 系统提示词档位：full/lite 为内置两套，custom 使用用户在设置页编写的文本。
 * 三个层级都可配置：模型 > Provider > 全局（AiDefaults），缺省逐层向上继承。
 */
export type SystemPromptKind = "full" | "lite" | "custom";

/**
 * 用户在「系统提示词管理」里编辑过的提示词文本覆盖。
 * 缺省的键表示该档使用内置版本；custom 没有内置版本，缺省即「未编写」。
 */
export type SystemPromptOverrides = {
  full?: string;
  lite?: string;
  custom?: string;
};

export type ModelEntry = {
  /** 发送给厂商的模型 ID，在整份配置中全局唯一。 */
  id: string;
  label: string;
  /** 上下文窗口（输入 token 预算）。 */
  inputTokens: number;
  /** 单次响应的输出上限；支持时同时作为 max_tokens 发送。 */
  outputTokens: number;
  supportsTemperature: boolean;
  /** 为 false 时该模型不出现在行内补全选择器中。 */
  supportsAutocomplete: boolean;
  /** 缺省时跟随 Provider / 全局设置；"custom" 使用 AiConfig.prompts.custom。 */
  systemPrompt?: SystemPromptKind;
  /** 每次请求额外携带的自定义请求体参数。 */
  params: ParamDef[];
  /** 模型未自行声明思考强度档位时的兜底阶梯。 */
  effort: EffortConfig | null;
  /** 原始逃生口：在所有参数之后合并进请求体。 */
  extra: JsonObject;
  /** 自由标记："reasoning" 表示跨轮保留 assistant 的推理内容。 */
  tags: string[];
};

export type ModelsApiConfig = {
  /** 追加到 baseURL 的路径，默认 "/models"。 */
  path: string;
  /** 响应 JSON 中数组的点路径；空表示响应根节点。 */
  itemsPath: string;
  /** 每个条目中模型 ID 的点路径。 */
  idPath: string;
  /** 每个条目中显示名称的点路径。 */
  labelPath?: string;
};

export type AuthMode = "bearer" | "x-api-key" | "none";

export type AuthConfig = {
  mode: AuthMode;
  /** mode 为 "x-api-key" 时使用的头名称，默认 "x-api-key"。 */
  header?: string;
  /** 网关允许匿名调用时设为 false。 */
  required: boolean;
};

/** 传输适配器枚举，实现在 `src/modules/ai/lib/agent.ts`。 */
export type ProtocolId = "openai-compatible" | "anthropic" | "google";

export type ProviderEntry = {
  id: string;
  label: string;
  protocol: ProtocolId;
  baseURL: string;
  consoleUrl?: string;
  /** 操作系统钥匙串的账户名。本文件绝不保存密钥本身。 */
  keyringAccount: string;
  auth: AuthConfig;
  /** 每次请求都会携带的静态头（可包含非密钥头）。 */
  headers: Record<string, string>;
  modelsApi: ModelsApiConfig | null;
  /** 该 Provider 下所有模型共享的系统提示词档位；缺省跟随全局设置。 */
  systemPrompt?: SystemPromptKind;
  /** 该 Provider 下所有模型共享的自定义请求体参数；模型重新声明同一 key 会整体替换。 */
  params: ParamDef[];
  /** 模型未自行声明思考强度档位时的兜底阶梯。 */
  effort: EffortConfig | null;
  models: ModelEntry[];
  /** Provider 图标注册表中的键；找不到时回退为插头图标。 */
  icon: string;
  /** true 表示来自内置目录，而非用户添加。 */
  builtin: boolean;
};

export type AiDefaults = {
  modelId: string;
  /** 全局系统提示词档位；缺省为 "full"。 */
  systemPrompt?: SystemPromptKind;
};

export type AiConfig = {
  version: number;
  defaults: AiDefaults;
  providers: ProviderEntry[];
  /** 用户在设置页覆盖过的提示词文本；只在实际修改后才写入。 */
  prompts?: SystemPromptOverrides;
};

/** 已解析的 (Provider, Model) 组合，交给 UI 与请求链路使用。 */
export type ModelInfo = {
  id: string;
  provider: string;
  providerLabel: string;
  label: string;
  description: string;
  inputTokens: number;
  outputTokens: number;
  model: ModelEntry;
  providerEntry: ProviderEntry;
};

export type ResolvedRequestParams = {
  body: JsonObject;
  warnings: string[];
};
