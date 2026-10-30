# 项目地图（project-lore）

这是 Terax 的「项目记忆地图」：记录代码说不清的**为什么**——业务约束、设计取舍、跨模块关联、踩过的坑。读者是没有任何前期上下文的接手者（包括失忆后的新会话）。

## 项目是什么

Terax 是一个开源的 AI 原生终端模拟器（Tauri 2 + React/TypeScript 前端 + Rust 后端），带多标签、文件管理器、代码编辑器、网页预览和 AI Agent。桌面端打包为 Windows（MSI/NSIS）、macOS、Linux 安装包。

## 四个核心业务概念

1. **主窗口、设置窗口和 AI 窗口是三个独立 webview**：设置与 AI 都不是主窗口里的 DOM 面板，各自拥有前端入口。偏好通过事件同步；AI 对话仍由主窗口唯一 Chat 引擎持有，AI 窗口只接收快照并发送命令。
2. **终端核心在独立包里**：`packages/ghostty-core` 是终端渲染/仿真核心，主应用通过它工作。
3. **CLI sidecar**：应用内嵌一个随包分发的命令行工具 `terax-cli`，由 Rust crate 编译后在构建期拷入安装包。
4. **模型配置是一份可手改的 JSON**：Provider、模型、请求参数、思考档位都来自应用数据目录的 `terax-ai-models.json`；设置页只是这份文件的图形编辑器，API Key 单独存操作系统钥匙串。

## 推荐阅读顺序

1. 本文件 → 2. [glossary.md](glossary.md)（术语对照）→ 3. [invariants.md](invariants.md)（不可违反的硬约束）→ 4. [map.md](map.md)（模块拓扑）→ 5. 需要动某个模块时读对应的 `decisions/` 与 `pitfalls/`。


## 地图维护规则

每完成一个功能、确立一条约束、做出一次取舍或踩到一个坑，都要就地更新本目录（规则见各文件头部与 `decisions/`、`pitfalls/` 模板）。修订旧结论时直接改写原条目并在 [changelog.md](changelog.md) 留痕，不新建副本。
