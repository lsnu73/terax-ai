# 模型配置 JSON 字段改为「表单 / JSON」双模式编辑
- 日期：2026-10-28
- 状态：已采纳
- 关联约束：INV-006、INV-008
- 关联坑点：pitfalls/2026-10-28-form-editor-value-sync.md

## 背景

模型配置重构（decisions/2026-10-28-data-driven-model-config.md）落地后，设置页的高级字段（Params / Thinking / Extra / Headers / Models API）以原始 JSON 文本域呈现。实际使用暴露两个问题：

1. 用户看到 Thinking 字段显示 `null` 时不知道该填什么——`null` 是有语义的正常值（不显示思考滑块），但裸 JSON 无法传达这一点；
2. 手敲 `ParamDef` / `ThinkingConfig` 这类结构化 JSON 容易写错字段名，错了只在保存时才被发现（或静默丢弃）。

同时 INV-006 要求 UI 编辑与手改 JSON 等价，不能为了易用性把 JSON 入口砍掉。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A（最终采用）：每个 JSON 字段一个「表单 / JSON」切换，默认表单 | 新手不面对裸 JSON；老手仍可直达 JSON；同一字段两种视图共享同一份文本，天然满足 UI/手改等价 | 每个字段类型要写一个表单组件（ParamsForm / ThinkingForm / ExtraForm / HeadersForm / ModelsApiForm） |
| B：保留纯 JSON 文本域，只加 placeholder 示例与 InfoHint | 实现最小 | 用户仍需手敲结构；`null` 语义依旧要靠阅读说明才能理解 |
| C：只做表单，移除 JSON 文本域 | UI 最简 | 违反 INV-006 的「等价」精神：无法粘贴整段配置、无法表达表单尚未覆盖的字段 |

## 结论与理由

选 A，实现于 `src/settings/sections/models/StructuredFields.tsx` 的 `StructuredJsonField<T>`，接线 7 处（模型 Params/Thinking/Extra + Provider Params/Thinking/Headers/Models API）。三条容易忘的实现约定：

- **空值写空字符串**：当值等于 `emptyValue`（`[]` / `null` / `{}`）时序列化为 `""`，让 JSON 模式显示格式化后的多行 placeholder 示例，而不是把 `[]` / `null` 这类噪音占在输入框里；
- **JSON → 表单切换时顺手 pretty-print**：解析成功且非空值时回写 `JSON.stringify(value, null, 2)`，把用户粘贴的紧凑 JSON 格式化；
- **null 语义由表单模式口头解释**：Thinking 为 `null` 时表单模式显示「该模型不会显示思考滑块」并提供「创建思考档位」按钮，而不是让用户猜。

**未来什么条件下应重新评估**：

- 如果表单组件数量继续膨胀、维护成本超过用户收益，可考虑按字段类型生成表单（由 JSON Schema 驱动）而不是逐字段手写；
- 如果某字段出现表单无法表达的结构（如嵌套条件），该字段应退回纯 JSON 模式，而不是让表单无限复杂化。
