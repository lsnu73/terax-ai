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

## AI 与模型配置

### 模型配置（数据驱动层）  `src/modules/ai/config/`
- 职责：把 Provider、模型、请求参数、思考档位全部收敛为一份可手工编辑的 JSON（`terax-ai-models.json`），让「新增厂商」变成配置操作而不是代码分支。
- 对外暴露：`registry.ts` 的同步查询（`resolveModel` / `listModels` / `providerNeedsKey` 等）、`params.ts` 的 `resolveRequestParams`、`store.ts` 的 `useAiConfigStore`。
- 关键依赖：[设置页 ModelsSection] → [config/store + persist] → [terax-ai-models.json]；[请求链路 agent.ts] →（resolveModel / resolveRequestParams）→ [config/registry + params]；[Ctrl+I 模型选择窗] →（thinkingLevels / thinkingLevelIndex）→ [config/params]。
- 易错点：见 pitfalls/2026-10-28-models-json-no-reload.md、pitfalls/2026-10-28-keys-before-config-hydration.md
- 决策依据：见 decisions/2026-10-28-data-driven-model-config.md、decisions/2026-10-28-thinking-ladder-per-model.md

### 请求发送与协议适配  `src/modules/ai/lib/agent.ts`、`providerHttp.ts`
- 职责：`agent.ts` 是全应用唯一感知传输 SDK 的地方（`protocol` 枚举 → adapter）；`providerHttp.ts` 负责连通性测试与 `/models` 拉取。用户参数由 `withRequestParams()` 在 SDK 序列化后注入请求体/头。
- 关键依赖：[agent.ts] →（authHeaders / resolveProviderFetch）→ [providerHttp.ts] → [proxyFetch] → [Rust `net::*` IPC]。
- 易错点：模型缓存键包含密钥与完整参数 JSON；参数变化会新建实例，改缓存键时必须保留这两个维度。

### 密钥存储  `src/modules/ai/lib/keyring.ts`
- 职责：API Key 只进操作系统钥匙串；Provider 配置里仅有 `keyringAccount` 账户名。语音转写使用独立账户（`openai-api-key` / `groq-api-key`），不依赖模型 Provider 目录。
- 关键依赖：[keyring.ts] →（`secrets_get` / `secrets_set` / `secrets_get_all`）→ [Rust secrets 模块]。
- 易错点：钥匙串账户列表来自当前配置快照；配置未 hydrate 时读取会得到空列表（见对应 pitfall）。

### 模型设置页与思考滑块  `src/settings/sections/ModelsSection.tsx`、`src/settings/sections/models/StructuredFields.tsx`、`src/modules/ai/components/AiStatusBarControls.tsx`
- 职责：ModelsSection 负责 Provider/模型的增删改、连通性测试、模型列表拉取与高级 JSON 编辑；StructuredFields 为结构化 JSON 字段提供「表单 / JSON」双模式编辑（Params/Thinking/Extra/Headers/Models API）与 InfoHint 悬浮说明；AiStatusBarControls 在 Ctrl+I 模型选择窗底部渲染思考滑块。
- 关键依赖：[ModelsSection] → [useAiConfigStore.replace] → [persist.writeAiConfig] →（Tauri 事件 `terax://ai-models-changed`）→ [主窗口]。
- 易错点：UI 与手改 JSON 必须走同一条 `normalizeAiConfig`；滑块档位来自所选模型自己的阶梯，无阶梯时不渲染；表单组件的值同步陷阱见 pitfalls/2026-10-28-form-editor-value-sync.md。
- 决策依据：见 decisions/2026-10-28-form-json-dual-mode.md

## 构建与打包

### 打包链路  `pnpm tauri build`
- 流程：`beforeBuildCommand`（`build:cli` 编译 sidecar + `tsc && vite build` 前端）→ cargo release 编译主程序 → 捆绑 MSI（WiX 3.14）与 NSIS 安装包。
- 产物：`src-tauri/target/release/bundle/{msi,nsis}/`。
- 易错点：见 pitfalls/2026-10-23-windows-build-network.md
