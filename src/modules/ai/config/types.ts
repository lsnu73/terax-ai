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

/** 参数写入出站 HTTP 请求的位置。 */
export type ParamLocation = "body" | "header";

export type ParamType = "string" | "number" | "boolean" | "object" | "array";

/**
 * 动态声明的请求参数。
 *
 * `key` 是逻辑标识，思考档位通过它引用参数。`path` 是实际发送时的键名
 * （点号会创建嵌套对象）。`map` 把逻辑档位值翻译为厂商的实际取值；
 * 映射结果为 `null` 表示“完全不发送该键”，用于厂商不接受 `"none"`、
 * 只能通过省略参数来关闭思考的场景。
 */
export type ParamDef = {
  key: string;
  label?: string;
  location: ParamLocation;
  /** body 参数的发送路径；header 参数的头名称。默认等于 key。 */
  path: string;
  type: ParamType;
  default?: JsonValue;
  /** 允许的发送值。仅作校验：越界值会被跳过并产生 warning。 */
  enum?: JsonValue[];
  /** 逻辑值（字符串化）-> 发送值；null 表示省略该键。 */
  map?: Record<string, JsonValue | null>;
  enabled: boolean;
  description?: string;
};

/** 思考滑块的一个档位。索引 0 恒为“关闭”。 */
export type ThinkingLevel = {
  id: string;
  label: string;
  /** 参数 key -> 逻辑值。`null` 表示该档位省略此参数。 */
  values: Record<string, JsonValue | null>;
};

export type ThinkingConfig = {
  /** 用户未选择时使用的档位 id，默认取 levels[0]。 */
  default?: string;
  /** 最左档位的标签，默认“Off”。 */
  offLabel?: string;
  levels: ThinkingLevel[];
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
  /** 取 "lite" 时使用精简版系统提示词。 */
  systemPrompt: "full" | "lite";
  params: ParamDef[];
  thinking: ThinkingConfig | null;
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
  /** 该 Provider 下所有模型共享的参数。 */
  params: ParamDef[];
  /** 模型未自行声明思考档位时的兜底阶梯。 */
  thinking: ThinkingConfig | null;
  models: ModelEntry[];
  /** Provider 图标注册表中的键；找不到时回退为插头图标。 */
  icon: string;
  /** true 表示来自内置目录，而非用户添加。 */
  builtin: boolean;
};

export type AiDefaults = {
  modelId: string;
};

export type AiConfig = {
  version: number;
  defaults: AiDefaults;
  providers: ProviderEntry[];
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
  headers: Record<string, string>;
  warnings: string[];
};
