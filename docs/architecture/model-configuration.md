# 模型配置体系（Providers · 参数 · 思考档位）

本文是 Terax「模型配置」的设计说明与操作手册。`TERAX.md` 仍是架构总纲，冲突时以 `TERAX.md` 为准。

结论先行：

- 厂商、模型、请求参数、思考档位**全部由 JSON 配置驱动**，运行时不读取任何硬编码的厂商参数名或档位取值。
- 新增一个 OpenAI 兼容厂商 = 往 JSON / 设置页加一条 provider，**核心代码零改动**；只有新增一种传输协议时才需要加一个 adapter。
- API Key 只存在操作系统钥匙串，JSON 里只有 `keyringAccount`（账户名）。
- 思考滑块的档位来自**模型自己声明的阶梯**，因此智谱、Qwen、豆包可以用完全不同的参数名与取值，代码无需分支。

---

## 1. 架构与职责

```
                         ┌──────────────────────────────────────────┐
                         │ terax-ai-models.json（人工可编辑）        │
                         │ version / defaults / providers[]         │
                         └───────────────┬──────────────────────────┘
                                         │ read / write（Tauri store）
                    ┌────────────────────▼─────────────────────┐
                    │ config/persist.ts                        │
                    │ config/normalize.ts（校验 / 去重 / 清洗） │
                    └────────────────────┬─────────────────────┘
                                         │ setAiConfig
                    ┌────────────────────▼─────────────────────┐
                    │ config/registry.ts（同步快照 + 查询 API） │
                    └───┬───────────────┬──────────────────┬───┘
                        │               │                  │
        ┌───────────────▼──┐   ┌────────▼─────────┐  ┌─────▼──────────────────┐
        │ Settings → Models│   │ Ctrl+I 模型选择窗 │  │ lib/agent.ts            │
        │ ModelsSection.tsx│   │ 思考滑块          │  │ resolveModel            │
        └──────────────────┘   └──────────────────┘  │ + resolveRequestParams  │
                                                     │ + protocol adapter      │
                                                     │ + param-injecting fetch │
                                                     └────────────┬────────────┘
                                                                  │
                                                     ┌────────────▼────────────┐
                                                     │ lib/providerHttp.ts      │
                                                     │ proxyFetch（Rust 代理）  │
                                                     └─────────────────────────┘
```

### 模块职责

| 文件 | 职责 | 对外接口 |
| --- | --- | --- |
| `src/modules/ai/config/types.ts` | 配置数据模型（Provider / Model / ParamDef / ThinkingLevel） | 纯类型 |
| `src/modules/ai/config/defaults.ts` | 内置**厂商元数据**（无模型清单） | `builtinProviders()` |
| `src/modules/ai/config/normalize.ts` | 任意 JSON → 合法配置；去重、补默认值、清洗密钥头 | `normalizeAiConfig()` |
| `src/modules/ai/config/registry.ts` | 内存快照与同步查询；变更广播 | `resolveModel` / `listModels` / `providerNeedsKey` … |
| `src/modules/ai/config/params.ts` | 参数合并、映射、路径写入、保护键 | `resolveRequestParams()` |
| `src/modules/ai/config/persist.ts` | `terax-ai-models.json` 读写、重新加载、跨窗口事件 | `readAiConfig` / `writeAiConfig` |
| `src/modules/ai/config/store.ts` | React 状态（Zustand）+ 启动 hydration | `useAiConfigStore` |
| `src/modules/ai/config/prompts.ts` | 系统提示词 | `selectSystemPrompt()` |
| `src/modules/ai/lib/agent.ts` | **唯一**的协议分支；模型缓存；参数注入；`streamText` | `buildLanguageModel` |
| `src/modules/ai/lib/providerHttp.ts` | 连通性测试、模型列表拉取、鉴权头 | `testProviderConnection` / `fetchProviderModels` |
| `src/modules/ai/lib/keyring.ts` | 钥匙串读写 | `getAllKeys` / `setKey` |
| `src/settings/sections/ModelsSection.tsx` | 设置页：增删改、测试、拉取、JSON 编辑 | React 组件 |
| `src/modules/ai/components/AiStatusBarControls.tsx` | Ctrl+I 模型选择窗 + 思考滑块 | React 组件 |

依赖方向单向：UI → registry/store → 纯数据。`registry` 不依赖任何 UI；请求链路不依赖 React。

---

## 2. 请求参数兼容方案（选型结论）

### 2.1 最终方案：结构化参数声明 + 原始 JSON 逃生口

采用**两层**机制，而不是只做「附加一段 JSON」：

1. **`ParamDef`（结构化声明）**：描述参数名、作用位置（body/header）、类型、默认值、可选值域、取值映射、启用开关。
2. **`extra`（原始 JSON 覆盖）**：模型级键值对，最后合并，用于一次性、未知结构的厂商字段。

只做 JSON 合并的问题：

- 无法表达「关闭思考时既要改 `thinking.type`，又要省略 `reasoning_effort`」这类**多键联动**。
- 无法表达 `medium → high`、`xhigh → max` 这类**取值归一化**，只能把厂商逻辑写进代码或让用户自己算。
- 滑块无法知道档位数量、标签和默认值，只能写死。
- 无法区分 body 与 header，也无法做类型/枚举校验。

结构化参数正好覆盖这些需求；`extra` 保留灵活性，二者共用同一份 JSON 文件。

### 2.2 合并顺序与冲突规则

从低到高：

| 优先级 | 来源 | 说明 |
| --- | --- | --- |
| 1 | 协议 adapter 生成的请求体 | AI SDK 生成的 `model` / `messages` / `stream` / `tools` |
| 2 | Provider `params` 的 `default` | 同一 `key` 被模型覆盖 |
| 3 | Model `params` 的 `default` | 模型级声明 |
| 4 | 当前思考档位的 `values` | 经 `map` 归一化；`null` = 省略该键 |
| 5 | Model `extra` | 原始覆盖，最后一个字 |

规则细节：

- 同一 `key` 以更高优先级为准；**模型级 ParamDef 会整体替换 Provider 级同 key 定义**。
- `map` 中值为 `null` → 不发送该参数；用于「厂商不接受 none，只能整键省略」。
- 映射结果若不在 `enum` 内 → 跳过并产生 warning（不会把非法值发给厂商）。
- **保护键**永不被覆盖：body 的 `model`、`messages`、`stream`、`tools`、`tool_choice`、`input`；header 的 `Authorization`、`Content-Type` 等。命中时跳过并 warning。
- 实际的写入由 `withRequestParams()`（`lib/agent.ts`）完成：抓取 SDK 已序列化好的 JSON，深合并后重建 `Request`。因此**任何厂商参数名都不出现在源码里**。

### 2.3 参数声明示例

```json
{
  "key": "reasoning_effort",
  "label": "Reasoning effort",
  "location": "body",
  "path": "reasoning_effort",
  "type": "string",
  "enum": ["none", "minimal", "low", "medium", "high", "xhigh", "max"],
  "map": {
    "none": null,
    "minimal": null,
    "low": "low",
    "medium": "high",
    "high": "high",
    "xhigh": "max",
    "max": "max"
  },
  "enabled": true
}
```

`path` 支持点号嵌套：`"path": "thinking.type"` 生成 `{"thinking":{"type":"enabled"}}`。

---

## 3. 思考档位映射

滑块出现在终端 Ctrl+I 的模型选择窗底部；档位**只来自当前模型（或 Provider 兜底）的 `thinking.levels`**。index 0 恒为最左端（关闭）。

### 3.1 智谱 GLM

GLM-5.3 / GLM-5.3-FLASH（仅 `low / high / max`）：

| 滑块档位 | 发送内容 |
| --- | --- |
| 关闭 | `thinking.type = "disabled"`；`reasoning_effort` 省略 |
| 低 | `thinking.type = "enabled"`，`reasoning_effort = "low"` |
| 高 | `thinking.type = "enabled"`，`reasoning_effort = "high"` |
| 最高 | `thinking.type = "enabled"`，`reasoning_effort = "max"` |

GLM-5.2（`low/medium → high`，`xhigh → max`，`none/minimal → 放弃思考`）：

| 滑块档位 | 发送内容 |
| --- | --- |
| 关闭 | `thinking.type = "disabled"`；`reasoning_effort` 省略 |
| 低 | `thinking.type = "enabled"`，`reasoning_effort = "low"` |
| 中 | `thinking.type = "enabled"`，`reasoning_effort = "high"` |
| 高 | `thinking.type = "enabled"`，`reasoning_effort = "high"` |
| 极高 | `thinking.type = "enabled"`，`reasoning_effort = "max"` |

所有归一化都写在 `map` 里，没有一行代码分支。GLM-5.2 的完整档位可在 `defaults.ts` 的 `GLM_52_THINKING_EXAMPLE` 找到，复制到某个模型行的 `thinking` 字段即可覆盖 Provider 默认。

### 3.2 其他内置形态

| Provider | 参数 | 档位 |
| --- | --- | --- |
| 阿里云百炼 Qwen | `enable_thinking`(bool) + `thinking_budget`(number) | 关闭 / 低(1024) / 中(4096) / 高(8192) |
| 火山方舟 豆包 | `thinking.type` | 关闭 / 自动 / 开启 |
| DeepSeek、Kimi、硅基流动等 | 未声明 | 不显示滑块（不伪造“关闭”） |

模型没有 `thinking` 时，选择窗不渲染滑块；用户可在模型 JSON 中补上 `thinking`，滑块立即出现。

### 3.3 档位的持久化与请求

- 选择结果按 `modelId → levelId` 存在 `terax-ai-settings.json` 的 `thinkingLevelByModel`。
- 未选择时使用 `thinking.default`，再退到第一个档位。
- 发送链路：`chatRuntime.getThinkingLevelId()` → `transport` → `runAgentStream` → `resolveRequestParams`。
- 行内补全与子代理强制使用**最左档位（关闭）**，终端场景优先低延迟。

---

## 4. JSON 配置

### 4.1 文件位置

- 路径：应用数据目录下的 `terax-ai-models.json`（设置页顶部会显示完整路径）。
- 顶层键：`version`、`defaults`、`providers`。
- 完整 JSON Schema：`docs/ai-models.schema.json`。
- 直接手工编辑后，点击设置页 **Reload from disk** 重新读取（不做文件监听，避免覆盖正在编辑的 UI 草稿）。

### 4.2 完整示例

```json
{
  "version": 1,
  "defaults": { "modelId": "glm-5.3" },
  "providers": [
    {
      "id": "zhipu",
      "label": "智谱 GLM",
      "protocol": "openai-compatible",
      "baseURL": "https://open.bigmodel.cn/api/paas/v4",
      "consoleUrl": "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
      "keyringAccount": "zhipu-api-key",
      "auth": { "mode": "bearer", "required": true },
      "headers": {},
      "modelsApi": null,
      "params": [
        {
          "key": "thinking.type",
          "location": "body",
          "path": "thinking.type",
          "type": "string",
          "enum": ["enabled", "disabled"],
          "enabled": true
        },
        {
          "key": "reasoning_effort",
          "location": "body",
          "path": "reasoning_effort",
          "type": "string",
          "enabled": true,
          "map": {
            "none": null,
            "minimal": null,
            "low": "low",
            "medium": "high",
            "high": "high",
            "xhigh": "max",
            "max": "max"
          }
        }
      ],
      "thinking": {
        "default": "high",
        "offLabel": "关闭",
        "levels": [
          { "id": "off", "label": "关闭", "values": { "thinking.type": "disabled", "reasoning_effort": "none" } },
          { "id": "low", "label": "低", "values": { "thinking.type": "enabled", "reasoning_effort": "low" } },
          { "id": "high", "label": "高", "values": { "thinking.type": "enabled", "reasoning_effort": "high" } },
          { "id": "max", "label": "最高", "values": { "thinking.type": "enabled", "reasoning_effort": "max" } }
        ]
      },
      "models": [
        {
          "id": "glm-5.3",
          "label": "GLM-5.3",
          "inputTokens": 200000,
          "outputTokens": 131072,
          "supportsTemperature": true,
          "supportsAutocomplete": true,
          "systemPrompt": "full",
          "params": [],
          "thinking": null,
          "extra": {},
          "tags": ["reasoning"]
        }
      ],
      "icon": "brain",
      "builtin": true
    }
  ]
}
```

`thinking: null` 表示继承 Provider 的档位；`models: []` 表示尚未录入模型。

### 4.3 校验策略

- 读盘后一律经过 `normalizeAiConfig()`；坏字段被丢弃并进入设置页顶部的 warning 列表，不会导致整个文件失效。
- 唯一性：`provider.id` 与 `model.id`（全局）必须唯一；重复项保留第一条并 warning。
- 数值钳制：`inputTokens ≥ 1000`、`outputTokens ≥ 1`；非法值回落默认。
- `thinking.levels` 为空 → 视为 `null`；`default` 不存在 → 回落到第一档。
- **密钥头清洗**：`headers` 中出现 `Authorization` / `x-api-key` / `api-key` / `x-goog-api-key` 时直接移除并 warning。
- UI 编辑与手工编辑写入同一个文档；UI 保存前也走同一套 normalize，因此两种入口结果等价。

---

## 5. 新增 Provider 操作指引

### 5.1 设置页（推荐，0 代码）

1. 设置 → Models → **Add provider**，选择内置厂商或“自定义 Provider”。
2. 填 **Base URL**；需要鉴权的填 API Key（写入钥匙串）。
3. 点 **Test**：成功会显示状态；401/403 提示鉴权失败；404 提示“端点可达但无模型列表接口”；网络错误会带原始原因。
4. 点 **Fetch model list** 拉取模型；选中即添加。没有列表接口的厂商在 **Add model** 里手动填写 Model ID、输入 token、输出 token。
5. 需要厂商专有参数时展开 **高级**，编辑 `Params` / `Thinking` JSON；模型行内的编辑面板可覆盖 Provider 级配置。
6. 在顶部 Defaults 里把新模型设为默认。

### 5.2 直接改 JSON

在 `providers` 数组追加：

```json
{
  "id": "my-vendor",
  "label": "My Vendor",
  "protocol": "openai-compatible",
  "baseURL": "https://api.my-vendor.example/v1",
  "consoleUrl": "https://console.my-vendor.example/keys",
  "keyringAccount": "my-vendor-api-key",
  "auth": { "mode": "bearer", "required": true },
  "headers": {},
  "modelsApi": { "path": "/models", "itemsPath": "data", "idPath": "id" },
  "params": [],
  "thinking": null,
  "models": [],
  "icon": "plug",
  "builtin": false
}
```

保存 → Reload from disk。然后在设置页填 Key、Test、拉取/添加模型。

### 5.3 需要写代码的唯一情况

厂商协议不是 OpenAI 兼容（例如私有二进制协议）：

1. 在 `src/modules/ai/lib/agent.ts` 的 `ADAPTERS` 增加一个 `protocol` 键与构造函数。
2. 在 `types.ts` 的 `ProtocolId` 与 `normalize.ts` 的 `PROTOCOLS` 增加枚举值。
3. 其余部分（配置、UI、参数、思考、密钥）无需改动。

### 5.4 内网 / 本地端点

`baseURL` 解析为 loopback 或私有网段时自动切换到允许私网的代理（LM Studio、Ollama、vLLM 均可直接填 `http://127.0.0.1:...`）。公网端点使用标准代理，保留 SSRF 防护。

---

## 6. 需求逐条对照

| # | 需求 | 实现位置 | 验证方式 |
| --- | --- | --- | --- |
| 1 | 删除国外厂商，替换为国内 Providers | `config/defaults.ts`（10 家国内厂商 + 自定义）；`package.json` 移除 cerebras/groq/xai SDK | `config.test.ts` 断言无 openai/anthropic/google；设置页 Add provider 菜单 |
| 2 | 模型列表去硬编码；支持 API 拉取；无接口则手动添加 | `defaults.ts` 每个 provider 的 `models: []`；`providerHttp.fetchProviderModels`；`ModelsSection` 的 Fetch/Add | 全新配置文件无任何模型；拉取 SiliconFlow/DeepSeek 列表；智谱/豆包手动添加 |
| 3 | 连接测试 + 明确成功/失败原因 | `providerHttp.testProviderConnection`；`ModelsSection` 的 Test/StatusLine | 正确 key → 成功；错 key → 401 文案；空 URL → 提示；404 → “无列表接口” |
| 4 | 新增模型需填 id、输入 token、输出 token、参数配置 | `ModelEditor`；`ModelEntry.inputTokens/outputTokens/params` | 表单校验 + 保存后 JSON 落盘 |
| 5 | 动态参数机制并在请求时正确合并/映射 | `config/params.ts`；`agent.ts` 的 `withRequestParams` | `config.test.ts` 覆盖映射、省略、嵌套、header、保护键、extra |
| 6 | 全部写入 JSON；UI 与手改等价；API Key 不入 JSON | `config/persist.ts`、`normalize.ts`、`keyring.ts` | 设置页显示文件路径与 Reload；密钥头清洗测试；钥匙串读写 |
| 7 | Ctrl+I 模型选择窗增加思考滑块，最左关闭，联动请求 | `AiStatusBarControls.tsx` 的滑块；`prefs.thinkingLevelByModel`；链路传参 | 选 GLM 模型 → 滑块 4 档；选无档位模型 → 隐藏；发送参数见 §3 |
| 8 | 删除模型列表的智力/速度/价格 | 删除 `ModelCapabilities`、`MODEL_PRICING`、`estimateCost`、`CapabilityBars`、成本行 | 全局 grep 无残留；模型列表只显示名称/id |

### 解耦复核（模拟新增 Provider）

- 新增「商汤日日新」：只在 JSON 加一条 provider（OpenAI 兼容），填 baseURL/模型 → 选择窗、设置页、请求链路自动生效。
- 不修改：`agent.ts`、`registry.ts`、`params.ts`、`keyring.ts`、任何 React 组件。
- 若用设置页操作，则连 JSON 都不用手写。

---

## 7. 刻意做出的取舍

| 议题 | 决定 | 理由 |
| --- | --- | --- |
| 模型 ID 是否全局唯一 | 唯一；冲突保留第一条并 warning | 选择器、收藏、最近使用、默认模型都以单个字符串为键，编码简单；同名模型应通过 label 区分 |
| 滑块是否每个模型单独声明 | 是；Provider 级仅作兜底 | 厂商/型号档位差异大，模型级才能准确表达 |
| 无思考能力的模型 | 不显示滑块 | 不伪造“关闭”档位，避免误导用户以为已关闭思考 |
| 手工改 JSON 的生效时机 | 显式 Reload，不监听文件 | 监听会与设置页未保存草稿竞争，造成“编辑被覆盖” |
| 参数优先级 | 档位 > 模型默认 > Provider 默认 > extra 最后 | 用户当下选择必须生效；`extra` 作为最终逃生口 |
| 默认模型存放 | JSON 的 `defaults.modelId` | 满足“全部配置落盘”；旧 `terax-settings.json` 字段已移除 |
| 配置存储实现 | Tauri `LazyStore`，三个顶层键 | 文件本身就是干净、可手改的 JSON；跨窗口用 Tauri 事件同步 |
