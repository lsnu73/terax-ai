# AI 提交信息生成

- 最后校验：2026-11-03
- 状态：可用
- 关联 lore：暂无（若沉淀「为什么只允许覆盖 system 提示词」的取舍理由，应进 lore）

## 1. 业务需求

在源代码管理面板中，用户暂存变更后点击「生成提交信息」按钮，AI 根据已暂存文件与 diff 生成一行 Conventional Commit 主题行，填入提交输入框。生成使用的系统提示词原先写死在代码里；现在用户可以在 设置 → AI 行为 中查看、修改该提示词，并可一键恢复内置默认。

## 2. 入口与调用链

- 面板入口：`src/modules/source-control/SourceControlPanel.tsx` 的生成按钮 → `src/modules/source-control/useSourceControlPanel.ts:833` 的 `generateCommitMessage`；无可用模型时通过 `src/modules/settings/openSettings.ts` 的 `openSettings("models")` 打开设置页模型配置。
- 提示词解析：`src/modules/source-control/useSourceControlPanel.ts:864` 调用 `selectCommitMessagePrompt`（`src/modules/ai/config/prompts.ts:113`），覆盖文本来自 `useAiConfigStore` 配置的 `commitMessagePrompt` 字段。
- 设置入口：`src/settings/sections/AgentsSection.tsx:809` 的 `CommitPromptBlock`，保存经 `useAiConfigStore.replace` 和 `src/modules/ai/config/persist.ts` 写入 `commitMessagePrompt`；重新打开设置页时由 `readAiConfig` 读回同一字段，恢复默认会删除该覆盖。
- 归一化：`src/modules/ai/config/normalize.ts:401`（非法/空值丢弃）。

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src/modules/source-control/useSourceControlPanel.ts` | 生成流程编排 | 生成 + 校验失败后的修复重试 |
| `src/modules/ai/config/prompts.ts` | 内置提示词与取值 | `BUILTIN_COMMIT_MESSAGE_PROMPT` / `selectCommitMessagePrompt` |
| `src/modules/ai/config/types.ts` | 配置数据模型 | `AiConfig.commitMessagePrompt` 覆盖字段 |
| `src/modules/ai/config/normalize.ts` | 配置收敛 | 空白文本不写入 |
| `src/modules/ai/config/persist.ts` | 配置持久化 | 读写 `commitMessagePrompt`，恢复默认时删除旧覆盖 |
| `src/modules/ai/config/persist.test.ts` | 持久化回归测试 | 验证保存后重读与恢复默认 |
| `src/settings/sections/AgentsSection.tsx` | 设置页模块 | `CommitPromptBlock`（编辑/保存/恢复默认） |
| `docs/ai-models.schema.json` | 配置文件 schema | `commitMessagePrompt` 属性 |

## 4. 数据流 / 关键流程

1. `generateCommitMessage` 前置校验：有已暂存文件、AI 空闲、模型可用且有密钥；无可用模型时打开设置页模型配置，缺少密钥时保留原错误提示。
2. 取已暂存 diff（60k 字符截断），用当前对话所选模型构建语言模型（与聊天共用链路，含自定义参数与思考强度档位）。
3. `generateText`：`system` 为 `selectCommitMessagePrompt(配置覆盖)`，`prompt` 为固定模板（格式要求 + 暂存文件摘要 + diff）。
4. 输出经 `cleanCommitMessage` 清洗；不符合 Conventional 前缀时用同一 system 提示词发起一次修复重试；仍无效则报错。

## 5. 对外接口

- 无独立对外接口；配置契约见 terax-ai-models.json 的 `commitMessagePrompt`（[AI模型配置](AI模型配置.md)）。

## 6. 配置与依赖

- 配置文件：应用数据目录下模型配置文件 terax-ai-models.json 的 `commitMessagePrompt`（缺省 = 内置文本）。
- 文案 i18n：`settings.agents.commitPrompt.*`（中英）。

## 7. 已知限制与注意事项

- 可配置的只有 system 提示词；`buildCommitMessagePrompt` / `buildRepairCommitMessagePrompt` 两个用户侧模板（格式要求、diff 附带）仍为固定代码。
- 输出合法性校验 `CONVENTIONAL_PREFIX` 固定在代码中：即使用户改写提示词，生成结果仍必须是一行 `type(scope): subject`，否则会被修复重试或拒绝。
- 生成结果只取第一行；提示词写多段也不会产生多行提交信息。

## 8. 变更记录（功能级）

- 2026-11-01 新增提示词可配置：内置提示词收敛到 `src/modules/ai/config/prompts.ts`，配置文件新增 `commitMessagePrompt` 覆盖，设置页 AI 行为新增「提交信息提示词」模块（编辑/保存/恢复默认）。
- 2026-11-03 修复保存后重开丢失：`src/modules/ai/config/persist.ts` 读写时保留 `commitMessagePrompt`，恢复默认时删除旧覆盖，并增加 round-trip 测试。
- 2026-11-03 无可用模型时，生成按钮与快捷键通过 `src/modules/settings/openSettings.ts` 跳转设置页模型配置；缺少 API Key 仍保留原错误提示。
