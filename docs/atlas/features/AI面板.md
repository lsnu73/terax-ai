# AI 面板

- 最后校验：2026-11-02
- 状态：已覆盖
- 关联 lore：[AI 面板与设置页迁入主窗口](../../lore/decisions/2026-10-31-AI面板与设置页迁入主窗口.md)（取代 2026-10-30 的跨 Webview 镜像方案）

## 1. 业务需求

用户按 Ctrl/Cmd+I 在主窗口右侧打开或关闭 AI 面板。面板与终端/编辑器共用同一个窗口，打开即渲染（React 挂载），不再创建原生窗口。面板可拖拽调宽，宽度持久化到 localStorage。

面板内容与原独立窗口一致：会话切换、聊天视图、Todo、计划模式横幅、完整 Composer（图片/附件/@文件/snippet/slash command）、输入框下方元信息行（角色、执行审批模式、上下文用量、模型切换）。Escape（非输入焦点）或关闭按钮关闭面板。

模型请求失败时，错误卡片展示原因以及“重试”“关闭”操作；重试重新请求失败的助手回合，不重复追加原用户消息。

## 2. 入口与调用链

- 快捷键：`src/modules/shortcuts/shortcuts.ts` 的 `ai.toggle`（Mod+I）。
- 主窗口协调：`src/app/App.tsx` 的 `toggleAi` / `openAi`（无可用 Provider 时打开设置页 models 分区）。
- 面板状态：`src/modules/ai/store/aiPanelStore.ts`（open / prefill）；开关封装在 `src/modules/ai/lib/aiPanel.ts`。
- 面板渲染：App.tsx 布局中 workspace 右侧的条件 `ResizablePanel`，懒加载 `src/modules/ai/components/AiPanel.tsx`。
- 聊天引擎：`AiPanelSession` 对当前会话调用 `getOrCreateChat` + `useChat`，与 `AgentRunBridge` 共享同一 Chat 实例。

```text
Ctrl/Cmd+I
  -> App.toggleAi
  -> aiPanelStore.togglePanel
  -> App 右侧 ResizablePanel 挂载 AiPanel（懒加载）
  -> getOrCreateChat(activeSessionId) 直读消息/状态

AiPanelComposer.submit
  -> buildComposerMessage（纯函数）
  -> chat.sendMessage（同一 Chat 实例，无 IPC）

AiChatView 请求失败卡片“重试”
  -> AiPanel 传入的 useChat.regenerate
  -> chat.regenerate（复用原消息历史，重新请求失败回合）
```

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src/modules/ai/components/AiPanel.tsx` | 面板页面 | 聊天、会话切换、计划横幅、空态建议；直连 stores，接入 `regenerate` |
| `src/modules/ai/components/AiChat.tsx` | 聊天视图 | 消息与流式状态渲染；请求失败卡片提供重试和关闭 |
| `src/modules/ai/components/AiPanelComposer.tsx` | 完整输入区 | 与旧 AiWindowComposer 同构；prefill 直接走 props |
| `src/modules/ai/store/aiPanelStore.ts` | 面板开关与 prefill | zustand；主窗口内共享，无事件桥 |
| `src/modules/ai/lib/aiPanel.ts` | 开关封装与 Provider 检查 | prefill 无可用 Provider 时转设置页 |
| `src/modules/ai/lib/aiPanelBridge.ts` | prefill 类型契约 | 仅剩 selection/attachment/text 类型 |
| `src/modules/ai/components/AgentRunBridge.tsx` | 主窗口聊天桥 | 持有唯一 Chat、agentMeta、持久化、AI diff tab 管理；审批待决时自动开面板 |
| `src/app/App.tsx` | 布局与快捷键接线 | 右侧 ResizablePanel、宽度持久化、`registerSettingsOpener` |

已删除（不再存在，仅作历史记录）：src/ai/、ai.html、src/modules/ai/lib/aiWindow.ts、aiWindowBridge.ts、src-tauri/src/modules/ai_window.rs，以及 open_ai_window / close_ai_window 命令。

## 4. 数据流与关键流程

1. 主 webview 内只有一份 Chat 运行时；面板与 AgentRunBridge 各自 `useChat` 订阅同一实例，无快照事件、无命令事件。
2. Composer 提交在面板内直接 `buildComposerMessage` + `chat.sendMessage`；slash command 由共享纯函数处理。
3. prefill（终端选区、编辑器选区、文件附件）经 `prefillAiPanel` 写入 aiPanelStore；面板挂载后由 Composer 消费并清除。
4. 工具审批待决时 AgentRunBridge 自动打开面板；AI diff tab 流程不变。
5. API Key 只经钥匙串 IPC 读取，不进任何 store 持久化。
6. 面板宽度经 `onResize` 写 `terax.ai-panel-width`（localStorage），下次打开复用。
7. 失败重试直接调用同一 Chat 的 `regenerate`：保留原用户消息和此前上下文，若已有部分助手回答则替换该回答；SDK 发起请求时清除旧错误并复用现有加载、停止和持久化链路。

## 5. 对外接口

- 快捷键 ID：`ai.toggle`。
- 状态契约：`useAiPanelStore`（open / prefill）。
- 类型契约：`src/modules/ai/lib/aiPanelBridge.ts`。
- HTTP 与第三方接口：本功能不新增；模型请求仍由主窗口既有 Agent 链路负责。

## 6. 验证与已知限制

- `pnpm check-types`、`pnpm test`（含 dist-budget 真实构建断言）、`cargo check` 全部通过（2026-10-31）。
- `pnpm lint`、`pnpm check-types`、`pnpm test` 通过（2026-11-02，2051 通过、1 跳过）；失败重试尚未进行桌面端真实网络故障手测。
- 面板是主窗口布局的一部分，不能再拖出主窗口或跨屏；需要浮窗场景需重新评估 lore 决策中的重开条件。
- 未逐项手测原独立窗口的完整交互矩阵（流式、审批、跨屏、位置恢复已随窗口移除而失效）。
- 重试以整个助手回合为粒度；若失败前已执行工具，重新生成可能再次执行工具，当前没有步骤级断点续传。
- dist-budget 断言 AI SDK / zod / Streamdown / CodeMirror 不进入启动图；AiPanel 懒加载维持该约束。

## 7. 变更记录

- 2026-10-30：以独立原生窗口形态建立，建立单聊天引擎跨 Webview 快照桥。
- 2026-10-31：角色/模型/上下文切换移入元信息行并新增执行审批模式；窗口挂主窗口 parent。
- 2026-10-31：窗口打开慢（WebView 冷启动为框架固有成本）→ 迁入主窗口右侧面板；删除原生窗口、ai.html 与跨窗口快照/命令桥，改为同 webview 直连 Chat。
- 2026-10-31：修复三处 UI 缺陷：①审批模式下拉无法切换——`src/modules/settings/store.ts` 的 `onPreferencesChange` 映射表漏登记 `aiApprovalMode`，写入偏好后 `usePreferencesStore` 收不到变更（新增 `[KEY_AI_APPROVAL_MODE]` 映射）；②空态打开时输入框被撑到最大高度——挂载首帧面板宽度未定型导致 scrollHeight 虚高（`AiComposerInput` 空值时还原 CSS 单行高度，并以 ResizeObserver 在宽度变化后重测）；③长回答从输入框下方穿过且无法滚动——聊天区包装层非 flex 容器，`Conversation` 的 `flex-1` 失效（包装层改 `flex min-h-0 flex-1 flex-col`，`Conversation` 补 `min-h-0`）。
- 2026-11-02：请求失败卡片新增“重试”，通过 `useChat.regenerate` 重发失败回合并保留“关闭”，不重复追加用户消息。
