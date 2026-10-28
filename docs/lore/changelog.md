# 地图修改时间线

只记录地图自身的重要修订，不记录与地图无关的代码变更。

- 2026-10-23 初始化地图（README/map/glossary/invariants 建档）；新增决策 1 条（设置窗口层级）、约束 2 条（INV-001 macOS parent+置顶互斥、INV-002 设置窗口禁止置顶浮动）、坑点 1 条（Windows 构建网络环境）。
- 2026-10-28 归档模型配置重构：map 新增「AI 与模型配置」四个模块条目；README 核心概念增至 4 条；glossary 新增 Provider/模型配置/ParamDef/思考档位/映射/adapter/钥匙串账户等 8 个术语；invariants 新增 5 条（INV-003 配置唯一事实来源、INV-004 Key 不入 JSON、INV-005 参数保护键与 null 省略、INV-006 UI/手改同一校验链路、INV-007 密钥读取依赖已 hydrate 配置）；decisions 新增 3 条（数据驱动参数方案、逐模型思考档位、独立 JSON + 显式 Reload）；pitfalls 新增 2 条（直改 JSON 不生效/覆盖风险、配置未 hydrate 读取钥匙串）。其中 2 条坑点的复发防护暂无自动化测试，已标注需手工验证。
