# 独立 AI 窗口

- 最后校验：2026-10-30
- 状态：已覆盖
- 关联 lore：[单聊天引擎跨 Webview 镜像](../../lore/decisions/2026-10-30-AI窗口采用单聊天引擎跨Webview镜像.md)、[同步窗口命令阻塞事件循环](../../lore/pitfalls/2026-10-30-同步命令创建AI窗口阻塞事件循环.md)

## 1. 业务需求

用户通过 Ctrl/Cmd+I 打开或关闭独立 AI 窗口，在窗口底部使用完整 Composer。窗口可以移动到屏幕任意位置，不受主窗口边界限制。主窗口终端下方不再显示 AI 输入区，终端保持自己的原生提示符输入。

## 2. 入口与调用链

- 快捷键：`src/modules/shortcuts/shortcuts.ts` 的 `ai.toggle`，默认仅绑定 Mod+I。
- 主窗口协调：`src/app/App.tsx:558` 的 `toggleAi` 调用 `toggleAiWindow`。
- 前端窗口管理：`src/modules/ai/lib/aiWindow.ts:24` 管理打开、关闭、Provider 检查和 prefill 补发。
- 原生窗口：`src-tauri/src/modules/ai_window.rs:33` 的异步 `open_ai_window` 创建 label 为 `ai` 的无 parent 原生窗口。
- 独立入口：`ai.html` 加载 `src/ai/main.tsx`，再渲染 `src/ai/AiWindowApp.tsx:71`。
- 状态镜像：`src/modules/ai/components/AgentRunBridge.tsx:96` 生成快照，并在第 130 行定向发送到 `ai`。
- 消息组装：`src/modules/ai/lib/composerMessage.ts:31` 统一处理文本、附件、选区、snippet 和 slash command。

```text
Ctrl/Cmd+I
  -> App.toggleAi
  -> invoke("open_ai_window" / "close_ai_window")
  -> ai.html + AiWindowApp
  -> AI_WINDOW_READY_EVENT
  -> AgentRunBridge 定向发送快照

AiWindowComposer.submit
  -> emitTo("main", AI_WINDOW_COMMAND_EVENT, submission)
  -> AgentRunBridge + buildComposerMessage
  -> 主窗口唯一 Chat.sendMessage
  -> 流式快照返回 AI 窗口
```

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src-tauri/src/modules/ai_window.rs` | 原生窗口生命周期 | 异步命令，无 parent，不限制屏幕坐标 |
| `src-tauri/src/lib.rs` | 命令注册与销毁事件 | AI 销毁通知主窗口，主窗口退出时级联清理 |
| `ai.html` | AI 独立 HTML 入口 | 包含启动错误提示 |
| `src/ai/main.tsx` | AI React 根 | 初始化主题、i18n 和首绘后 show |
| `src/ai/AiWindowApp.tsx` | AI 窗口页面 | 聊天、会话、模型、Todo、计划与 Composer |
| `src/modules/ai/components/AiWindowComposer.tsx` | 完整输入区 | 图片、文本附件、@ 文件、snippet、slash command |
| `src/modules/ai/lib/composer.tsx` | Composer 状态 | 远程提交通过 `sendSubmission` 转发主窗口 |
| `src/modules/ai/lib/composerMessage.ts` | 消息转换 | 两个窗口复用同一消息格式 |
| `src/modules/ai/lib/aiWindowBridge.ts` | 跨窗口契约 | 快照、prefill 和结构化命令类型 |
| `src/modules/ai/components/AgentRunBridge.tsx` | 主窗口聊天桥 | 唯一聊天引擎，处理命令并镜像流式状态 |
| `src/modules/ai/lib/aiWindow.ts` | 窗口开关与 prefill | 失败时回滚乐观状态 |

## 4. 数据流与关键流程

1. 主 webview 持有唯一 Chat 实例，AI webview 不调用 `getOrCreateChat`，避免重复请求和双份审批状态。
2. AI 窗口 ready 后，主窗口定向发送会话、消息、状态、模型、工作区、计划和 Todo 快照。
3. Composer 发送完整 `ComposerSubmission`，主窗口用纯函数构造 AI SDK parts；`/plan` 等命令也在主 webview 执行。
4. 停止、Continue、审批、会话切换、模型切换和计划操作通过命令桥回到主窗口。
5. 终端或编辑器选区通过 `prefillAiWindow` 转成 Composer chip，不再写入主窗口 docked 输入区。
6. API Key 不进入快照。AI 窗口只通过正规 keyring 接口读取模型选择器所需的密钥状态。
7. 原生位置和尺寸由 `tauri-plugin-window-state` 恢复，不使用 localStorage 或主窗口视口 clamp。

## 5. 对外接口

- 快捷键 ID：`ai.toggle`。
- Tauri 命令：`open_ai_window`、`close_ai_window`。
- 窗口 label：`main`、`ai`，事件通过 `emitTo` 定向发送。
- 类型契约：`src/modules/ai/lib/aiWindowBridge.ts`。
- HTTP 与第三方接口：本功能不新增；实际模型请求仍由主窗口现有 Agent 链路负责。

## 6. 验证与已知限制

- 已在 Windows 开发版验证 Ctrl+I 开关、完整 Composer 加载、草稿输入、移出主窗口边界和关闭重开位置恢复。
- 当前验证环境只有一个显示器，未实测跨显示器拖动。
- 为避免未经确认的外部请求和费用，原生验证只输入草稿，没有向模型服务发送消息；消息格式由 `src/modules/ai/lib/composerMessage.test.ts` 覆盖。
- 流式回显、停止、Continue 和工具审批共用主窗口既有 Chat 链路，但本次未对真实 Provider 做端到端请求。
- 发行安装包、macOS 和 Linux 原生窗口行为未在本次 Windows 验证中覆盖。

## 7. 变更记录

- 2026-10-30：删除 docked AI 输入区和旧 DOM mini 窗口，迁移完整 Composer 到原生独立窗口，默认快捷键改为 Mod+I，并建立单聊天引擎的跨窗口快照与命令桥。
- 2026-10-30：复核 Composer chips 与终端统一块化造成的时间戳漂移；文件、选区和命令 chips 仍由共享 ChipsRow 展示，AI 窗口桥接不变。
- 2026-10-30：复核块输入方式修正造成的时间戳漂移；终端恢复原生提示符输入，底部共享输入区已删除，AI 窗口与 prefill 链路不变。
