# 项目地图（project-lore）

这是 Terax 的「项目记忆地图」：记录代码说不清的**为什么**——业务约束、设计取舍、跨模块关联、踩过的坑。读者是没有任何前期上下文的接手者（包括失忆后的新会话）。

## 项目是什么

Terax 是一个开源的 AI 原生终端模拟器（Tauri 2 + React/TypeScript 前端 + Rust 后端），带多标签、文件管理器、代码编辑器、网页预览、语音输入和 AI Agent。桌面端打包为 Windows（MSI/NSIS）、macOS、Linux 安装包。

## 三个核心业务概念

1. **主窗口与设置窗口是两个独立 webview**：设置不是主窗口里的一个面板，而是 Tauri 的第二个窗口（label `settings`），有自己独立的前端入口。两者通过 Tauri 事件同步偏好设置。
2. **终端核心在独立包里**：`packages/ghostty-core` 是终端渲染/仿真核心，主应用通过它工作。
3. **CLI sidecar**：应用内嵌一个随包分发的命令行工具 `terax-cli`，由 Rust crate 编译后在构建期拷入安装包。

## 推荐阅读顺序

1. 本文件 → 2. [glossary.md](glossary.md)（术语对照）→ 3. [invariants.md](invariants.md)（不可违反的硬约束）→ 4. [map.md](map.md)（模块拓扑）→ 5. 需要动某个模块时读对应的 `decisions/` 与 `pitfalls/`。

读完 map.md 仍卡住时：仓库已被 Repowise 索引（根目录 `.repowise/`），可用 terax/repowise MCP 的 `get_answer` 直接提问；官方架构文档在 `docs/architecture/`。

## 地图维护规则

每完成一个功能、确立一条约束、做出一次取舍或踩到一个坑，都要就地更新本目录（规则见各文件头部与 `decisions/`、`pitfalls/` 模板）。修订旧结论时直接改写原条目并在 [changelog.md](changelog.md) 留痕，不新建副本。
