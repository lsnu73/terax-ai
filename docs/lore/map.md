# 全局模块拓扑

箭头方向 = 调用/数据流向。只记录跨模块、改了会互相牵连的关系；单模块内部结构看代码。

## 窗口与外壳

### 应用外壳（Tauri 后端）  `src-tauri/src/`
- 职责：进程入口、原生窗口创建与管理、前端命令（IPC）的 Rust 实现。
- 对外暴露：`open_settings_window` 等 `#[tauri::command]`；入口 `lib.rs` 的 `run()`。
- 关键依赖：[前端主应用] →（invoke `open_settings_window`）→ [应用外壳] →（创建 label=`settings` 的 webview 窗口，parent 为主窗口）→ [设置窗口]。
- 易错点：见 pitfalls 与 INV-001、INV-002（窗口层级约束）。
- 决策依据：见 decisions/2026-10-23-settings-window-z-order.md

### 前端主应用  `src/app/`、`src/main.tsx`
- 职责：主窗口 UI（终端标签页、编辑器、AI 面板）。
- 对外暴露：`src/modules/settings/openSettingsWindow.ts` 的 `openSettingsWindow(tab?)`，是打开设置窗口的唯一入口（App.tsx、AgentSwitcher、AiStatusBarControls 等调用）。
- 关键依赖：[前端主应用] → [应用外壳]（IPC）；[前端主应用] → [ghostty-core]（终端渲染）。

### 设置窗口  `src/settings/`、`src/modules/settings/`
- 职责：独立 webview 中的设置页（general/editor/themes/shortcuts/models/agents/about 七个标签）。
- 关键依赖：[设置窗口] →（Tauri 事件 `terax:settings-tab` 接收标签切换）；`src/modules/settings/store.ts` 的每个 setter 都通过 Tauri 事件镜像广播，因为 `LazyStore.onChange` 只在写入进程内触发，主窗口收不到设置窗口的写入（这是跨窗口同步的隐性约束，改 setter 时不能漏掉广播）。
- 决策依据：见 decisions/2026-10-23-settings-window-z-order.md

## 终端与 CLI

### ghostty-core  `packages/ghostty-core/lib/`
- 职责：终端仿真与渲染核心（含 WebGPU surface），被主应用引用（根包 19 处 import）。
- 对外暴露：`lib/core.ts`。

### terax-cli sidecar  `src-tauri/crates/terax-cli/`
- 职责：随安装包分发的命令行工具。构建期由 `scripts/build-cli.mjs` 用 cargo 编译为 release，拷到 `src-tauri/binaries/terax-cli-<target>` 作为 Tauri sidecar。
- 易错点：见 pitfalls/2026-10-23-windows-build-network.md（build-cli 从仓库根调用 cargo，`.cargo/config.toml` 必须放根目录才生效）。

## 构建与打包

### 打包链路  `pnpm tauri build`
- 流程：`beforeBuildCommand`（`build:cli` 编译 sidecar + `tsc && vite build` 前端）→ cargo release 编译主程序 → 捆绑 MSI（WiX 3.14）与 NSIS 安装包。
- 产物：`src-tauri/target/release/bundle/{msi,nsis}/`。
- 易错点：见 pitfalls/2026-10-23-windows-build-network.md
