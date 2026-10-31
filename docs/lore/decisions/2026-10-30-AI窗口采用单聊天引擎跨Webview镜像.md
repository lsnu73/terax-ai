# AI 窗口采用单聊天引擎跨 Webview 镜像

- 日期：2026-10-30
- 状态：已被取代（2026-10-31 AI 迁入主窗口右侧面板，见 [AI面板与设置页迁入主窗口](2026-10-31-AI面板与设置页迁入主窗口.md)；单聊天引擎原则保留，跨 Webview 镜像协议已删除）

## 背景

独立 AI 窗口必须离开主窗口边界，因此不能再使用主 React 树里的 DOM 浮层。但直接在新 webview 再挂一套 Chat 会产生两个运行时，带来重复模型请求、流式状态分叉、审批无法对应原工具调用、会话和计划队列互相覆盖的问题。完整 Composer 还需要保留附件、选区、snippet、slash command、模型、会话和计划能力，不能退化成只发送文本的简化输入框。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A（最终采用）主 webview 持有唯一 Chat，AI webview 只做视图和命令遥控 | 请求、审批、会话和计划只有一份事实来源；原生窗口可跨屏移动 | 需要显式快照协议，流式更新有 IPC 成本 |
| B 两个 webview 各自创建 Chat | 页面实现直接 | 容易双发请求，审批和运行状态无法天然一致 |
| C 保留主窗口 DOM 浮层 | 不需要跨窗口协议 | 受主窗口裁剪，不满足移动到屏幕任意位置 |
| D AI 窗口重写简化 Composer | 跨窗口数据较少 | 丢失图片、附件、snippet 和 slash command 等现有能力 |

## 结论与理由

采用 A。主窗口 `AgentRunBridge` 是唯一聊天运行桥，通过 `emitTo` 定向发送快照并接收结构化命令。AI 窗口使用完整 `ComposerSubmission`，主窗口通过共享纯函数 `buildComposerMessage` 生成消息 parts，避免两套消息格式漂移。`/plan` 和工具审批也只在主 webview 执行。

快照不携带 API Key。AI 窗口为了模型选择器读取密钥状态时，仍通过操作系统钥匙串 IPC，而不是把秘密放进事件负载。窗口位置交给原生 window-state 插件，不再使用主窗口视口 clamp 或 localStorage 几何状态。

**重新评估条件**：如果未来需要两个独立 Agent 同时运行不同会话，或主窗口关闭后 AI 窗口仍必须独立工作，应重新设计聊天引擎的宿主和生命周期；如果定向快照被证明无法承载流式吞吐，应先优化传输协议，不能直接复制 Chat 运行时。

## 相关功能代码

- 功能文档：[atlas/features/AI面板.md](../../atlas/features/AI面板.md)
- 主窗口桥：`src/modules/ai/components/AgentRunBridge.tsx`
- 跨窗口契约：`src/modules/ai/lib/aiWindowBridge.ts`
- 独立页面：`src/ai/AiWindowApp.tsx`
