# 技术架构

- 最后校验：2026-10-30

## 技术栈与版本

| 层 | 选型 | 版本或约束 | 备注 |
|---|---|---|---|
| 桌面外壳 | Tauri | 2.x，发行版启用 `devtools` | 主窗口、独立设置窗口、独立 AI 窗口 |
| 原生侧 | Rust | stable，edition 2021 | 所有操作系统访问与 IPC 命令 |
| 前端 | React、TypeScript | React 19，TypeScript 6 | 三个 HTML 入口 |
| 构建 | Vite、pnpm | Vite 8，Node 22+，pnpm 11.9 | pnpm workspace |
| 终端 | libghostty-vt WASM、portable-pty | 仓库固定适配版本 | WebGPU 默认，WebGL 回退 |
| 编辑器 | CodeMirror | 6.x | 语言、LSP 与主题按需配置 |
| AI | Vercel AI SDK | 6.x | BYOK 与本地模型 |
| 状态与 UI | Zustand、Tailwind CSS、Radix UI | Zustand 5，Tailwind 4 | shadcn/ui 组件 |
| 持久化 | JSON 文件、tauri-plugin-store、OS keychain | 无外部数据库 | 会话、偏好、模型配置与密钥分离 |

## 分层与进程边界

```text
React 主窗口 / 设置窗口 / AI 窗口
  -> Tauri invoke、定向事件与自定义协议
  -> Rust 命令层与原生模块
  -> 文件系统、PTY、Git、进程、网络、钥匙串
```

- Rust 独占操作系统访问，webview 不直接访问文件、进程或 shell。
- 主窗口入口是 `src/main.tsx`，由 `src/app/App.tsx` 组装业务模块。
- 设置窗口入口是 `src/settings/main.tsx`，通过 Tauri 事件与主窗口同步偏好。
- AI 窗口入口是 `src/ai/main.tsx`。主 webview 持有唯一 Chat 引擎，AI webview 通过定向快照和命令桥镜像对话。
- 新逻辑优先放在依赖轻的纯函数中，React 组件和 Tauri 命令保持薄层。

IPC 命令索引见 [../architecture/two-process-model.md](../architecture/two-process-model.md)，安全边界见 [../architecture/security-model.md](../architecture/security-model.md)。

## 目录结构

| 目录 | 职责 | 不该放什么 |
|---|---|---|
| `src/app/` | 主窗口组装、跨模块协调 | 可独立沉淀的领域算法 |
| `src/modules/` | 按业务域划分的自包含前端模块 | 跨模块相对导入 |
| `src/settings/` | 独立设置窗口及设置分区 | 主窗口运行时状态 |
| `src/ai/` | 独立 AI 窗口入口与页面组装 | 第二个 Chat 引擎或 Provider 请求链路 |
| `src/components/` | 通用 UI 与注册表生成组件 | 具体业务编排 |
| `src-tauri/src/` | 原生入口、IPC 命令、操作系统适配 | React 状态或 UI 逻辑 |
| `src-tauri/crates/` | CLI 与控制协议等 Rust workspace crate | webview 组件 |
| `packages/ghostty-core/` | 终端模型与 WASM 适配核心 | 应用层标签和 Space 状态 |
| `scripts/` | 构建、性能、IPC 与终端验证工具 | 产品运行时代码 |

前端模块细目见 [../../TERAX.md](../../TERAX.md) 的 Module layout，避免在此维护第二份逐模块说明。

## 关键第三方库

| 库 | 用途 | 注意事项 |
|---|---|---|
| `portable-pty` | 创建和管理原生交互终端 | Windows 使用 ConPTY 与 Job Object |
| `ai` 与 Provider SDK | 模型对话、流式响应和工具调用 | Provider 由数据配置，协议适配保持封闭 |
| `zustand` | 前端会话与界面状态 | 持久化由专门 store 或原生文件层负责 |
| `codemirror-languageserver` | 编辑器 LSP 客户端 | 按需加载，进程宿主在 Rust |
| `react-resizable-panels` | 侧栏与工作区尺寸调整 | 不替代终端内部的 PaneNode 树 |
| `tauri-plugin-store` | 偏好设置持久化 | 跨窗口同步还依赖显式事件 |

## 配置与环境变量

应用数据目录中的模型配置文件名为 **terax-ai-models.json**，会话索引为 **terax-ai-sessions.json**，各会话消息单独存放。API Key 只存操作系统钥匙串。模型配置的完整契约见 [../architecture/model-configuration.md](../architecture/model-configuration.md)。

预览端口预设保存在偏好文件 **terax-settings.json** 的 `previewPortPresets` 字段。默认值来自 `src/modules/preview/lib/portPresets.ts`，加载时按稳定 ID 合并与去重。

| 环境变量 | 含义 | 默认值 | 必填 |
|---|---|---|---|
| `TAURI_DEV_HOST` | 指定 Vite 开发服务器主机 | 未设置 | 否 |
| `VITE_REACT_SCAN` | 开发模式启用 React Scan | `false` | 否 |
| `INSPECT` | 启用 Vite 模块图检查 | `false` | 否 |
| `ANALYZE` | 构建时生成包体分析 | `false` | 否 |
| `TERAX_BENCH` | 构建真实应用基准驱动 | 未设置 | 仅 app-lab |
| `TERAX_BENCH_IDENTIFIER` | 基准构建的独立应用标识 | 无 | 仅基准构建 |

Tauri 的开发地址、构建前后命令和打包配置位于 `src-tauri/tauri.conf.json`，前端分包与环境判断位于 `vite.config.ts`。

## 编码约定

- 前端跨模块导入统一使用 `@/`，包管理器只使用 pnpm。
- 注释只解释代码无法表达的原因，代码、注释、提交和文档不使用 em dash 或 emoji。
- 用户可见文案进入 en/zh 双字典，硬约束见 [../lore/invariants.md](../lore/invariants.md)。
- 展示在按钮提示中的快捷键必须从 `src/modules/shortcuts/shortcuts.ts` 注册表动态取得，使用 `ShortcutTooltip` 或 `useShortcutHint`，不得硬编码。约束见 INV-012。
- 核心子系统行为变化必须增加锁定契约的测试，测试说明见 [../contributing/testing.md](../contributing/testing.md)。
- 新功能先进入对应的 `src/modules/<area>/`，`src/app/App.tsx` 只承担协调。

## 与 lore 的边界

模块间隐性依赖与历史决策见 [../lore/map.md](../lore/map.md) 和 [../lore/README.md](../lore/README.md)。
