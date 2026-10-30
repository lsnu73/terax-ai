# 项目总览

- 最后校验：2026-10-30
- 状态：开发中

## 一句话

Terax 是一个终端优先、AI 原生的跨平台桌面开发工作区，使用 Tauri 2、Rust、React 和 TypeScript 构建。

## 解决什么问题

开发者通常需要在终端、编辑器、文件管理器、Git 工具和 AI 对话窗口之间切换。Terax 把这些入口放进同一个桌面窗口，让 AI 能读取当前工作区上下文，并在用户审批后执行文件或命令操作。模型服务可由用户自行选择，密钥保存在操作系统钥匙串中。

## 使用方

- 本地开发者：使用多标签终端、分屏、编辑器、文件树、Git 和预览完成日常开发。
- AI 编码代理用户：通过自带密钥或本地模型运行代理，审查工具调用与编辑差异。
- 终端编码工具用户：在终端中运行 Claude Code、Codex 等外部代理，并接收状态通知。
- 贡献者与维护者：通过 Atlas 定位功能代码，通过 lore 查询约束与设计背景。

## 业务边界

- 产品是终端优先的开发工作区，不是完整 IDE。
- 不集成 Jupyter 式工作区、完整调试器与性能分析套件、包管理器界面或完整 Web 浏览器。
- 不建设 IDE 规模的扩展宿主，也不做无界后台索引。
- 不提供账号体系与遥测；AI Provider 和密钥由用户配置。
- 编辑器、LSP、AI 补全和预览等能力必须保持按需加载与资源有界。

## 核心术语表

| 术语 | 业务含义 | 对应代码实体 |
|---|---|---|
| Space | 一个可保存根目录、环境和标签布局的工作空间 | `src/modules/spaces/` |
| Tab | 主工作区中的一个终端、编辑器、预览或差异视图 | `Tab`，`src/modules/tabs/lib/useTabs.ts` |
| Pane / Leaf | 终端标签页内的一个分屏叶节点，对应一个终端会话 | `PaneNode`，`src/modules/terminal/lib/panes.ts` |
| PTY | 原生侧维护的交互式伪终端会话 | `src-tauri/src/modules/pty/` |
| Ghostty model | 保存终端网格、滚动历史和解析状态的 WASM 模型 | `packages/ghostty-core/` |
| BYOK | 用户提供自己的模型服务密钥或本地端点 | `src/modules/ai/` |
| Provider | 一家模型服务商或兼容端点的配置条目 | `ProviderEntry`，`src/modules/ai/config/types.ts` |
| 设置窗口 | 独立的 Tauri webview，不是主窗口内嵌面板 | `src/settings/main.tsx` |

易混淆术语的详细裁定沿用 [../lore/glossary.md](../lore/glossary.md)，不在此复制。

## 与 lore 的关系

不可违反的业务与技术约束见 [../lore/invariants.md](../lore/invariants.md)，跨模块隐性依赖见 [../lore/map.md](../lore/map.md)。
