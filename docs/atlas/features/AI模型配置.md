# AI 模型配置

- 最后校验：2026-11-12
- 状态：可用
- 关联约束：[INV-023](../../lore/invariants.md#inv-023)（Provider ID 改名保留钥匙串账户与已有密钥）、[INV-024](../../lore/invariants.md#inv-024)（离开模型页先完成自动保存再提示）；params 与 Effort 的职责分工规则见 §4。

## 1. 业务需求

Provider 和模型全部由数据驱动（应用数据目录下的 terax-ai-models.json），设置页与该文件编辑的是同一份配置。新配置的 Provider 列表默认为空，内置目录只用于「添加 Provider」模板；已有用户配置不做清理或迁移。用户可以自定义请求体额外参数（如频率惩罚系数），也可以按档位设置模型的思考强度。两者的职责分工是硬性规则：

- **Params**：每次请求都携带的自定义请求体参数（静态取值），例如 `frequency_penalty`、`top_p` 等高级参数。
- **Effort（思考强度）**：只负责思考强度档位。所有档位共用一个请求体参数名（`path`），每个档位只填写自己的实际取值；取值 `null` 表示省略该参数（关闭思考）。

设置页通过字段说明、空态文案与表单底部的规则提示明示这一分工（i18n 键 `settings.models.structured.paramsRule` / `effortRule` 及对应 `*RuleHint`）。

Provider 的显示名 `label` 与稳定标识 `id` 都可修改。`id` 用于配置查找、模型归属和自动补全引用，不允许为空或与现有 Provider 重名；改名会保留 `keyringAccount`、已有模型和 API Key，并把指向旧 ID 的自动补全偏好迁移到新 ID。

Provider 高级表单和已有模型的编辑表单不再提供底部保存按钮。字段停止输入约 600ms 后自动保存，保存状态显示在表单内；JSON 无效时不写入配置并显示错误。新增模型仍需显式创建，因为模型 ID 与必填参数完整前不能生成有效配置。离开模型设置分区、切换到其他标签或关闭设置标签时，应用等待所有自动保存落盘后再提示；任何表单一保存失败都提示未完整保存，不会谎报成功。

## 2. 入口与调用链

- 设置页入口：`src/settings/sections/ModelsSection.tsx:1165` 的 `ModelEditor`（模型级）与 `:1630` 的 `ProviderAdvancedEditor`（Provider 级共享/兜底）。
- Provider ID：`src/settings/sections/ModelsSection.tsx:543` 的 `ProviderCard` 展开区提供 ID 输入，失焦或回车提交；`:190` 的 `updateProvider` 串行写入并调用改名纯函数迁移相关引用。
- Provider 自动保存：`src/settings/sections/ModelsSection.tsx:1686` 的 `saveDraft` 校验并写入当前草稿；`:1630` 的编辑器在草稿变化后防抖保存，并在卸载前刷新待保存内容。
- 模型自动保存：已有模型编辑态的 `ModelEditor`（`:1165`，保存实现 `:1225`）使用相同的防抖、状态提示、卸载刷新和保存协调器；新增模型仍由显式创建按钮提交。
- 离页等待与提示：`src/settings/SettingsView.tsx:127` 的 `notifyModelsLeave` 在离开模型分区或设置 tab 时调用 `src/settings/modelSettingsAutosave.ts:40` 的 `settleModelAutosave`；`:190` 的 `WorkspaceSurface` 把设置 tab 是否可见传入 SettingsView。
- 改名规则：`src/modules/ai/config/providerRename.ts:15` 的 `renameProvider` 负责 trim、空值、重名和不存在检查，只替换 Provider 的 `id`。
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
| `src/modules/ai/config/defaults.ts` | 默认配置与内置模板 | 默认 Provider 为空；目录仅供添加模板；导出 `GLM_52_EFFORT_EXAMPLE` |
| `src/modules/ai/config/normalize.ts` | 收敛与迁移 | 旧 `thinking`、旧 `ParamDef` 自动迁移，非法值丢弃并告警 |
| `src/modules/ai/config/params.ts` | 请求参数引擎 | 合并顺序：params → effort 档位 → 模型 `extra` |
| `src/modules/ai/config/providerRename.ts` | Provider ID 改名 | 校验空值、重名和不存在的 Provider，只替换 ID 并保留其余配置 |
| `src/modules/ai/config/persist.ts` | 文件读写 | 读写 Provider、系统提示词和提交信息提示词，恢复默认时删除覆盖 |
| `src/modules/ai/config/persist.test.ts` | 持久化回归测试 | 首次空配置、提示词 round-trip、清除覆盖与已有配置保留 |
| `src/modules/ai/config/registry.ts` | 查询助手 | `resolveModel` / `toModelInfo` 等 |
| `src/modules/ai/lib/agent.ts` | 传输注入 | 唯一感知传输 SDK 的位置；`PROTECTED_BODY_KEYS` 防劫持 |
| `src/settings/sections/ModelsSection.tsx` | 设置页 | 模型/Provider 编辑器、自动保存、校验 |
| `src/settings/modelSettingsAutosave.ts` | 自动保存协调 | 注册表单刷新函数，等待进行中的保存并汇总成功/失败 |
| `src/settings/SettingsView.tsx` | 离页提示 | 检测离开模型分区或设置 tab，等待保存后显示进度提示 |
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
7. Provider ID 改名后只替换 `id`：模型数组、`keyringAccount`、图标和参数等原样保留；`autocompleteProvider` 等于旧 ID 时改写到新 ID，页面内密钥快照同步换键。原内置模板会重新出现在「添加 Provider」目录中。
8. Provider 与模型写入通过单个队列串行化，多个已展开卡片和模型编辑器的自动保存不会用旧配置快照互相覆盖。离开模型页时先刷新所有已注册表单，再等待已发出但未完成的保存，最后才显示保存结果提示。

## 5. 对外接口

- 用户接口：设置 → 模型（Provider 卡片「高级」折叠区、模型行编辑器）、Ctrl+I 模型选择窗底部思考强度滑条。
- 数据契约：`src/modules/ai/config/types.ts`（`AiConfig` / `ProviderEntry` / `ModelEntry` / `ParamDef` / `EffortConfig`；`AiConfig.commitMessagePrompt` 为提交信息提示词覆盖，见 [AI提交信息生成](AI提交信息生成.md)）。
- 偏好键：`effortLevelByModel`（存储键名为历史遗留的 `thinkingLevelByModel`）。

## 6. 已知限制与注意事项

- 一个 Effort 阶梯只能写一个请求体参数名；像 Qwen「开关 + token 预算」这类双参数组合无法在单一阶梯内表达（内置目录用布尔开关 + 二档）。
- 旧多参数键 `thinking` 配置会被丢弃并告警，需要用户在设置页重新配置。
- 参数值与档位取值支持完整 JSON（对象/数组），输入时先按 JSON 解析、失败则当普通字符串。
- 自动保存覆盖 Provider 高级字段、Provider ID、Base URL，以及已有模型的全部编辑字段；API Key 草稿仍使用输入框旁边的保存操作，新增模型仍使用显式创建按钮。离开模型页的提示只表示已自动保存的 Provider 与已有模型配置，不表示未提交的密钥或新增模型草稿已经保存。
- Provider 高级表单 JSON 无效时不会写入配置；离开模型页会显示保存失败提示，用户需要返回模型设置修正。

## 7. 变更记录

- 2026-10-31：重构 params 与 thinking。`params` 收敛为「静态自定义请求体参数」（移除 location/path/type/enum/map）；`thinking` 更名为 `effort`（思考强度），改为「一个参数名 + 每档一个取值」，不再引用 params 的逻辑 key；设置页两种表单均明示分工规则；含旧格式自动迁移。
- 2026-11-03：新配置默认 Provider 列表改为空，内置目录保留为添加模板；补全 `prompts` 与 `commitMessagePrompt` 的磁盘读写和持久化回归测试。
- 2026-11-12：Provider 展开区新增可编辑稳定 ID；拒绝空值和重名，改名保留钥匙串账户、模型与 API Key，并迁移自动补全偏好和页面密钥快照。新增 `src/modules/ai/config/providerRename.test.ts` 回归测试。
- 2026-11-12：Provider 高级表单移除底部保存按钮，改为防抖自动保存并显示保存状态；离开模型分区、切换标签或关闭设置页时等待保存完成并提示结果。Provider 写入改为串行队列，避免多个卡片的自动保存互相覆盖。
- 2026-11-12：已有模型的编辑表单同样改为防抖自动保存并移除保存按钮，复用离页等待与保存协调器；Provider 与模型写入统一走同一串行队列，新增模型仍显式创建。
