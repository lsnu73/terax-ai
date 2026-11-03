# AI 模型配置

- 最后校验：2026-10-31（`terax-diy`，含本轮 params/effort 重构）
- 状态：可用
- 关联 lore：暂无（params 与 Effort 的职责分工规则见 §4，若沉淀取舍理由应进 lore）

## 1. 业务需求

Provider 和模型全部由数据驱动（应用数据目录下的 terax-ai-models.json），设置页与该文件编辑的是同一份配置。用户可以自定义请求体额外参数（如频率惩罚系数），也可以按档位设置模型的思考强度。两者的职责分工是硬性规则：

- **Params**：每次请求都携带的自定义请求体参数（静态取值），例如 `frequency_penalty`、`top_p` 等高级参数。
- **Effort（思考强度）**：只负责思考强度档位。所有档位共用一个请求体参数名（`path`），每个档位只填写自己的实际取值；取值 `null` 表示省略该参数（关闭思考）。

设置页通过字段说明、空态文案与表单底部的规则提示明示这一分工（i18n 键 `settings.models.structured.paramsRule` / `effortRule` 及对应 `*RuleHint`）。

## 2. 入口与调用链

- 设置页入口：`src/settings/sections/ModelsSection.tsx:964` 的 `ModelEditor`（模型级）与 `:1292` 的 `ProviderAdvancedEditor`（Provider 级共享/兜底）。
- 表单：`src/settings/sections/models/StructuredFields.tsx:521` 的 `ParamsForm`、`:667` 的 `EffortForm`、`:302` 的 `parseEffort`；校验在 `src/settings/sections/ModelsSection.tsx:130` 的 `validateEffortConfig`。
- 配置持久化：`src/modules/ai/config/persist.ts`（写入应用数据目录下的 terax-ai-models.json，密钥不入文件，存 OS 钥匙串）。
- 归一化与旧格式迁移：`src/modules/ai/config/normalize.ts:97` 的 `normalizeParam`、`:163` 的 `migrateLegacyThinking`。
- 请求参数引擎：`src/modules/ai/config/params.ts:158` 的 `resolveRequestParams`（纯函数，UI 与传输层共用）。
- 传输层注入：`src/modules/ai/lib/agent.ts:110` 的 `withRequestParams` 包装 fetch；`:194` 的 `buildLanguageModel` 接收 `effortLevelId`。
- 用户档位滑条：`src/modules/ai/components/ModelPicker.tsx:109`（`effortLevels`），选择写入偏好。

请求链路：

```text
ModelPicker 选档位 -> setEffortLevel -> preferences.effortLevelByModel
chatRuntime.getEffortLevelId -> runAgentStream(effortLevelId)
  -> resolveRequestParams(provider, model, levelId)
  -> withRequestParams 合并进出站请求体
```

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src/modules/ai/config/types.ts` | 数据模型 | `ParamDef`（key/value/enabled）、`EffortConfig`（path+levels） |
| `src/modules/ai/config/defaults.ts` | 内置厂商目录 | 首次启动播种；导出 `GLM_52_EFFORT_EXAMPLE` 参考示例 |
| `src/modules/ai/config/normalize.ts` | 收敛与迁移 | 旧 `thinking`、旧 `ParamDef` 自动迁移，非法值丢弃并告警 |
| `src/modules/ai/config/params.ts` | 请求参数引擎 | 合并顺序：params → effort 档位 → 模型 `extra` |
| `src/modules/ai/config/persist.ts` | 文件读写 | 应用数据目录下的模型配置 JSON |
| `src/modules/ai/config/registry.ts` | 查询助手 | `resolveModel` / `toModelInfo` 等 |
| `src/modules/ai/lib/agent.ts` | 传输注入 | 唯一感知传输 SDK 的位置；`PROTECTED_BODY_KEYS` 防劫持 |
| `src/settings/sections/ModelsSection.tsx` | 设置页 | 模型/Provider 编辑器、校验 |
| `src/settings/sections/models/StructuredFields.tsx` | 表单 | ParamsForm / EffortForm / ExtraForm / HeadersForm |
| `src/modules/ai/components/ModelPicker.tsx` | 思考强度滑条 | Ctrl+I 模型选择窗底部 |
| `src/modules/settings/store.ts` | 偏好持久化 | `effortLevelByModel`；存储键沿用旧名 `thinkingLevelByModel` |
| `src/modules/i18n/locales/zh/settings/models.ts` | 中文文案 | 规则提示与字段说明 |
| `src/modules/i18n/locales/en/settings/models.ts` | 英文文案 | 与中文词典同构 |

## 4. 数据流与关键规则

1. 合并顺序（后者覆盖前者）：Provider `params` → Model `params`（同 key 整体替换）→ 当前 Effort 档位值写入 `EffortConfig.path` → 模型 `extra` 原始覆盖。
2. `null` 取值表示从请求体中删除该键——厂商不接受某取值、只能靠省略参数关闭思考时使用。
3. `PROTECTED_BODY_KEYS`（`messages`/`model`/`stream`/`tools`/`tool_choice`/`input`）禁止被 params、effort、extra 覆盖，越界即跳过并产生 warning。
4. Effort 兜底：模型未声明时取 Provider 的 `effort`；档位 id 记入偏好，按模型隔离。
5. 旧配置迁移（`src/modules/ai/config/normalize.ts`）：旧 `thinking` 档位若全部档位恰好共用一个参数键则迁移为该键的取值阶梯；引用多个参数键的旧配置无法无损迁移，丢弃并返回 warning。旧 `ParamDef` 只保留 body 位置且有取值的条目。
6. 旧格式 header 参数已移除：静态请求头统一走 Provider 的 `headers` 配置。

## 5. 对外接口

- 用户接口：设置 → 模型（Provider 卡片「高级」折叠区、模型行编辑器）、Ctrl+I 模型选择窗底部思考强度滑条。
- 数据契约：`src/modules/ai/config/types.ts`（`AiConfig` / `ProviderEntry` / `ModelEntry` / `ParamDef` / `EffortConfig`；`AiConfig.commitMessagePrompt` 为提交信息提示词覆盖，见 [AI提交信息生成](AI提交信息生成.md)）。
- 偏好键：`effortLevelByModel`（存储键名为历史遗留的 `thinkingLevelByModel`）。

## 6. 已知限制与注意事项

- 一个 Effort 阶梯只能写一个请求体参数名；像 Qwen「开关 + token 预算」这类双参数组合无法在单一阶梯内表达（内置目录用布尔开关 + 二档）。
- 旧多参数键 `thinking` 配置会被丢弃并告警，需要用户在设置页重新配置。
- 参数值与档位取值支持完整 JSON（对象/数组），输入时先按 JSON 解析、失败则当普通字符串。

## 7. 变更记录

- 2026-10-31：重构 params 与 thinking。`params` 收敛为「静态自定义请求体参数」（移除 location/path/type/enum/map）；`thinking` 更名为 `effort`（思考强度），改为「一个参数名 + 每档一个取值」，不再引用 params 的逻辑 key；设置页两种表单均明示分工规则；含旧格式自动迁移。
