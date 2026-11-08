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
- 对外暴露：`src/modules/settings/openSettingsWindow.ts` 的 `openSettingsWindow(tab?)`，是打开设置窗口的唯一入口（App.tsx、AgentSwitcher、ModelPicker 等调用）。
- 关键依赖：[前端主应用] → [应用外壳]（IPC）；[前端主应用] → [ghostty-core]（终端渲染）。
- 易错点：`main.tsx` 是**顶层 await 模块**且窗口在 `tauri.conf.json` 里 `visible:false`、由前端首屏后 `window.show()`——入口模块任何一步崩溃都表现为「编译正常、进程活着、窗口永不出现」。排查手法见 pitfalls/2026-10-28-i18n-circular-import-tdz.md。

### i18n  `src/modules/i18n/`
- 职责：全应用文案（中/英），语言偏好来自 settings（`"system"` 按操作系统语言判定）。
- 对外暴露：组件内 `useTranslation`；组件外（配置表、toast、校验信息）用模块级 `t()`；入口 `initI18n()`（三个窗口入口各自顶层 await）。
- 关键依赖：[i18n] →（运行期 `t()` 被全应用静态 import，合法方向）；i18n 自身**不得静态依赖上层模块**（INV-009），对 preferences 的读取是 `initI18n` 内的动态 import。
- 易错点：见 pitfalls/2026-10-28-i18n-circular-import-tdz.md。
- 决策依据：见 decisions/2026-10-28-i18n-architecture.md

### 设置窗口  `src/settings/`、`src/modules/settings/`
- 职责：独立 webview 中的设置页（general/editor/themes/shortcuts/models/agents/about 七个标签）。
- 关键依赖：[设置窗口] →（Tauri 事件 `terax:settings-tab` 接收标签切换）；`src/modules/settings/store.ts` 的每个 setter 都通过 Tauri 事件镜像广播，因为 `LazyStore.onChange` 只在写入进程内触发，主窗口收不到设置窗口的写入（这是跨窗口同步的隐性约束，改 setter 时不能漏掉广播）。
- 决策依据：见 decisions/2026-10-23-settings-window-z-order.md

### 开发者工具  `src-tauri/src/lib.rs`、`src/modules/shortcuts/`
- 职责：从主窗口或设置窗口打开当前 webview 的 WebView DevTools。
- 对外暴露：快捷键 `devtools.open`；Tauri 命令 `open_devtools`。
- 关键依赖：[主窗口按钮或快捷键] → [Shortcut registry] → [App handler] → [Rust 命令] → [WebView DevTools]。
- 代码索引：见 [atlas/features/开发者工具.md](../atlas/features/开发者工具.md)
- 决策依据：见 decisions/2026-10-30-发行版启用开发者工具.md
- 易错点：发行版依赖 `Cargo.toml` 的 `devtools` feature 和显式 Rust 命令；`devtools.open` 必须保持独立注册，AI 开关现在由 `ai.toggle` 的 Mod+I 处理。

## 终端与 CLI

### ghostty-core  `packages/ghostty-core/lib/`
- 职责：终端仿真与渲染核心（含 WebGPU surface），被主应用引用（根包 19 处 import）。
- 对外暴露：`lib/core.ts`。

### 无边框窗口边缘交互  `src/app/components/WindowEdgeValves.tsx`、`src/lib/maximizedChrome.ts`、`src/styles/globals.css`、`src/components/WindowControls.tsx`
- 职责：自绘无边框窗口的边缘命中与外观：最大化四角直角、窗口控制按钮通栏点击区、左右边框「阀段=侧栏操作 / 其余=原生 resize」分流。
- 对外暴露：`useWindowMaximized()`（React 组件）；CSS 状态契约 `<html data-chrome="borderless">` 与 `<html data-maximized>`（`trackMaximizedChrome()` 镜像，仅非 macOS）。
- 关键依赖：[无边框窗口边缘交互] →（`startResizeDragging`）→ [tao 原生窗口 resize]；[tao `WM_NCHITTEST`] →（非最大化时吃掉最外圈约 4px 指针事件、最大化时整条边框放行，INV-019）→ [无边框窗口边缘交互]。`maximizedChrome.ts` 的 DOM 属性镜像与 React hook 是同一订阅的两条消费通道，改监听逻辑必须两处同验；改 `globals.css` 圆角或新增自绘透明图层必须同步 `[data-maximized]` 直角规则（INV-018）。
- 代码索引：见 [atlas/features/无边框窗口与边框交互.md](../atlas/features/无边框窗口与边框交互.md)
- 决策依据：见 decisions/2026-11-08-无边框窗口边缘交互分流.md
- 易错点：见 pitfalls/2026-11-08-最大化后四角点击穿透.md

### 终端命令与结果块  `src/modules/terminal/`、`src-tauri/src/modules/pty/scripts/`
- 职责：所有终端统一按 OSC 133 边界呈现命令和结果块，保持原生提示符与直接输入，提供块右键操作。
- 对外暴露：`GhosttyBlocks.blockAtLine`、`BlockContextMenu`、`GhosttyBlockOverlay`。
- 关键依赖：[Shell OSC 133] → [Ghostty tracked pins] → [块控制器与覆盖层]；[终端右键] → [选区优先判断] → [块命中与菜单]；[块内查找] → [局部 TerminalSearchController] → [App searchTarget] → [共享 SearchInline]；[Ctrl+R] → [全局分发跳过] → [Shell 原生历史搜索]。
- 代码索引：见 [atlas/features/终端命令与结果块.md](../atlas/features/终端命令与结果块.md)
- 决策依据：见 decisions/2026-10-30-终端统一命令与结果块.md
- 易错点：选区菜单与块菜单必须互斥（INV-013）；Ctrl+R 必须同时受全局分发和设置保存两层保护（INV-014）；全文与块内查找必须共享 SearchInline（INV-016），独立输入框会被菜单焦点恢复覆盖，见 [pitfalls/2026-11-02-命令块查找焦点被终端抢回.md](pitfalls/2026-11-02-命令块查找焦点被终端抢回.md)；`TERAX_BLOCKS=1` 只预留块头间隔空行，绝不能隐藏原生提示符；`plain` 表示缺少命令边界上报，不是独立终端类型。

### 终端链接打开  `src/modules/terminal/lib/terminalLinks.ts`、`src/modules/terminal/ghostty/`
- 职责：把终端中的 URL 分到系统浏览器或 Terax 内置预览。
- 对外暴露：surface 的 `onOpenLink(uri, modifiers)`；应用侧的 `openPreviewTab(url)`。
- 关键依赖：[WebGPU surface 或 WebGL surface] → [useGhosttyTerminalSession 分流] → [TerminalPane] → [TerminalStack] → [WorkspaceSurface] → [App.openPreviewTab]。
- 代码索引：见 [atlas/features/终端链接打开.md](../atlas/features/终端链接打开.md)
- 易错点：修改 `onOpenLink` 签名时必须同步 WebGPU 与 WebGL 两个 surface；Shift 分支只接受 HTTP(S)，其他协议仍走系统打开。

### terax-cli sidecar  `src-tauri/crates/terax-cli/`
- 职责：随安装包分发的命令行工具。构建期由 `scripts/build-cli.mjs` 用 cargo 编译为 release，拷到 `src-tauri/binaries/terax-cli-<target>` 作为 Tauri sidecar。
- 易错点：见 pitfalls/2026-10-23-windows-build-network.md（build-cli 从仓库根调用 cargo，`.cargo/config.toml` 必须放根目录才生效）。

## AI 与模型配置

### AI 面板（主窗口右侧）  `src/modules/ai/components/AiPanel.tsx`、`src/modules/ai/store/aiPanelStore.ts`
- 职责：把完整 Composer 和对话视图放进可跨屏移动的原生窗口，同时保持唯一聊天运行时。
- 对外暴露：快捷键 `ai.toggle`；zustand 状态 `useAiPanelStore`（open / prefill）。
- 关键依赖：[AI webview] →（结构化命令）→ [主窗口 AgentRunBridge] → [唯一 Chat] →（定向快照）→ [AI webview]。
- 代码索引：见 [atlas/features/AI面板.md](../atlas/features/AI面板.md)
- 易错点：同步命令创建或销毁窗口会阻塞 Windows 事件循环，见 pitfalls/2026-10-30-同步命令创建AI窗口阻塞事件循环.md。
- 决策依据：见 decisions/2026-10-30-AI窗口采用单聊天引擎跨Webview镜像.md

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
- 职责：API Key 只进操作系统钥匙串；Provider 配置里仅有 `keyringAccount` 账户名。
- 关键依赖：[keyring.ts] →（`secrets_get` / `secrets_set` / `secrets_get_all`）→ [Rust secrets 模块]。
- 易错点：钥匙串账户列表来自当前配置快照；配置未 hydrate 时读取会得到空列表（见对应 pitfall）。

### 模型设置页与思考滑块  `src/settings/sections/ModelsSection.tsx`、`src/settings/sections/models/StructuredFields.tsx`、`src/modules/ai/components/ModelPicker.tsx`
- 职责：ModelsSection 负责 Provider/模型的增删改、连通性测试、模型列表拉取与高级 JSON 编辑；StructuredFields 为结构化 JSON 字段提供「表单 / JSON」双模式编辑（Params/Thinking/Extra/Headers/Models API）与 InfoHint 悬浮说明；ModelPicker 在 AI 面板的模型选择器中渲染思考滑块。
- 关键依赖：[ModelsSection] → [useAiConfigStore.replace] → [persist.writeAiConfig] →（Tauri 事件 `terax://ai-models-changed`）→ [主窗口]。
- 易错点：UI 与手改 JSON 必须走同一条 `normalizeAiConfig`；滑块档位来自所选模型自己的阶梯，无阶梯时不渲染；表单组件的值同步陷阱见 pitfalls/2026-10-28-form-editor-value-sync.md。
- 决策依据：见 decisions/2026-10-28-form-json-dual-mode.md

## 界面交互与预览配置

### 快捷键注册与提示  `src/modules/shortcuts/`
- 职责：维护快捷键 ID、默认绑定、用户覆盖解析，以及按钮提示中的动态键位文本。
- 对外暴露：`SHORTCUTS`、`ShortcutId`、`ShortcutTooltip`、`ShortcutHint`、`useShortcutHint`、`shortcutHintLabel`。
- 关键依赖：[按钮组件] → [useShortcutHint] → [preferences.shortcuts 或默认绑定]；[设置页改键] → [preferences store] → [所有提示自动刷新]。
- 代码索引：见 [atlas/features/快捷键提示.md](../atlas/features/快捷键提示.md)
- 易错点：新增按钮提示必须走公共 API，否则用户改键后仍显示旧键位，见 INV-012。

### 设置选项搜索  `src/settings/`
- 职责：跨分区检索稳定设置项与快捷键，按分区归组展示结果，并定位到当前分区中的目标设置。
- 对外暴露：`SETTING_SEARCH_ITEMS` 搜索元数据、`SettingsSearch` 查询组件、设置行 `data-setting-id` 锚点。
- 关键依赖：[搜索组件] → [当前语言词典 + 快捷键注册表 + 偏好可见性]；[命中项] → [按 item.section 的局部 Map 归组]；[结果选择] → [分区切换] → [同 ID 锚点]。
- 代码索引：见 [atlas/features/设置页.md](../atlas/features/设置页.md)
- 易错点：新增可搜索选项必须同步索引与锚点，不能按翻译文本或 DOM 序号定位，见 INV-015；分类分组由前端命中结果派生，不能反向写入或假设静态索引顺序展示。
- 决策依据：见 decisions/2026-11-02-设置搜索使用静态索引.md、decisions/2026-11-04-设置页左侧导航与结果分组.md

### 预览端口配置  `src/modules/preview/`、`src/modules/settings/store.ts`
- 职责：管理预览端口预设的默认值、用户编辑和跨窗口持久化。
- 对外暴露：`PreviewPortPreset`、`normalizePreviewPortPresets`、`upsertPreviewPortPreset`、偏好字段 `previewPortPresets`。
- 关键依赖：[PortPresetDialog] → [setPreviewPortPresets] → [terax-settings.json] → [prefs-changed] → [PreviewAddressBar]。
- 代码索引：见 [atlas/features/预览端口管理.md](../atlas/features/预览端口管理.md)
- 决策依据：见 decisions/2026-10-30-预览端口预设按稳定标识持久化.md
- 易错点：`settings/store.ts` 可以引用预览模块的纯数据文件，但 `lib/portPresets.ts` 不得反向引用 settings store；内置项按稳定 ID 合并，改默认值时不要更换已有 ID。

## 构建与打包

### 打包链路  `pnpm tauri build`
- 流程：`beforeBuildCommand`（`build:cli` 编译 sidecar + `tsc && vite build` 前端）→ cargo release 编译主程序 → 捆绑 MSI（WiX 3.14）与 NSIS 安装包。
- 产物：`src-tauri/target/release/bundle/{msi,nsis}/`。
- 易错点：见 pitfalls/2026-10-23-windows-build-network.md
