# AI 命令运行到终端

- 最后校验：2026-11-15
- 状态：已覆盖
- 关联文档：[AI命令执行](AI命令执行.md)（AI 自己跑命令的 `bash_run` 工具，不经过终端提示符）、[终端命令与结果块](终端命令与结果块.md)（注入后命令在终端中的块归因与交互）

## 1. 业务需求

AI 回答中的 shell 代码块和 `suggest_command` 工具结果提供「运行」按钮（悬停文案「在活动终端中运行」）：把命令文本注入当前活动终端的提示符处，等价于用户手动粘贴，**不自动执行**（用户自行回车）。点击后按钮短暂变为「已发送」。多行命令必须保持行序与 AI 输出一致；活动标签不是终端时按钮无效果。

## 2. 入口与调用链

- 命令代码块卡片：`src/components/ai-elements/chat-code.tsx:183` 的 `CommandCard`（仅 shell 语言代码块渲染），运行按钮为 `src/components/ai-elements/chat-code.tsx:219` 的 `RunInTerminalButton`。
- 工具结果卡片：`src/components/ai-elements/tool.tsx:738` 的 `SuggestCommandCard`（`suggest_command` 工具，定义在 `src/modules/ai/tools/terminal.ts:8`）。
- 通道契约：`src/modules/ai/store/chatStore.ts:27` 的 `live.injectIntoActivePty(text): boolean`；`src/modules/ai/store/chatRuntime.ts:31` 提供给工具层转发。
- 桥实现：`src/modules/ai/lib/useAiLiveBridge.ts:95` 的 `injectIntoActivePty`——先走会话粘贴编码，失败才回退裸写。
- 会话粘贴：`src/modules/terminal/lib/terminalSessionApi.ts:43` 的 `pasteIntoSession` → `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts:361` 的 `pasteIntoGhosttySession` → `src/modules/terminal/ghostty/input/GhosttyInputController.ts:207` 的 `paste`，按 shell 的 bracketedPaste 模式编码（`src/modules/terminal/ghostty/input/terminalInputEncoding.ts` 的 `encodeTerminalPaste`）。
- 写入：`src/modules/terminal/ghostty/useGhosttyTerminalSession.ts:1234` 的 `BoundedPtyWriter`（FIFO 队列 + 批量上限）→ Rust `pty_write`。

```text
「运行」点击（RunInTerminalButton / SuggestCommandCard）
  -> chatStore.live.injectIntoActivePty(command)
  -> useAiLiveBridge: 活动标签必须是终端
     ├─ pasteIntoSession(leafId, text)   （优先）
     │    -> GhosttyInputController.paste
     │    -> encodeTerminalPaste：\n 归一为 \r；bracketedPaste 开启时包 \x1b[200~/201~
     │    -> BoundedPtyWriter.enqueue -> pty_write
     ├─ 失败回退：TerminalPaneHandle.write（裸字符串直写）
     └─ term.focus()
```

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src/components/ai-elements/chat-code.tsx` | 命令代码块卡片 | `CommandCard` + `RunInTerminalButton`；区分 shell 语言与非 shell 代码块 |
| `src/components/ai-elements/tool.tsx` | suggest_command 卡片 | `SuggestCommandCard` 复用同一注入通道；该文件其余工具渲染属「AI 对话与工具审批」（未覆盖） |
| `src/modules/ai/store/chatStore.ts` | live 通道契约 | `injectIntoActivePty` 声明与默认 false 实现 |
| `src/modules/ai/store/chatRuntime.ts` | 工具层转发 | 工具上下文经此调用同一通道 |
| `src/modules/ai/lib/useAiLiveBridge.ts` | live 桥实现 | 注入走粘贴编码优先、裸写回退；同一桥还承载终端上下文读取与托管代理 |
| `src/modules/terminal/lib/terminalSessionApi.ts` | 粘贴封装 | `pasteIntoSession` 薄封装；该文件主归属「撤销终端窗格拆分」 |
| `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts` | 会话粘贴与写入 | `pasteIntoGhosttySession`、`BoundedPtyWriter` |
| `src/modules/terminal/ghostty/input/terminalInputEncoding.ts` | 粘贴编码纯函数 | `encodeTerminalPaste` / `encodeTerminalSubmission`（后者服务终端输入框提交） |

## 4. 数据流与关键流程

1. 注入必须走会话粘贴编码而不是裸 `term.write`：AI 命令按 Markdown 解析后行分隔符是裸 `\n`，直写 ConPTY 会被 PSReadLine 当连续击键逐行接受并乱序回显；粘贴编码把 `\n` 归一为 `\r`，shell 开启 bracketed paste 时整体包进粘贴标记，PSReadLine 按一次粘贴原子渲染，顺序天然正确（2026-11-15 修复）。
2. 粘贴编码按 `model.modes().bracketedPaste` 实时决定：未开启时只做换行归一，不包标记。
3. 回退路径仅在输入控制器缺失时触发（会话未就绪），此时仍裸写原始字符串。
4. 注入不附加回车、不调用 `blocks.controller.submitted`（那是终端输入框提交路径），因此不会触发命令块提交归因。

## 5. 对外接口

- 组件契约：`Live.injectIntoActivePty(text: string): boolean`（`src/modules/ai/store/chatStore.ts:27`）。
- 终端侧契约：`pasteIntoSession(leafId, text)`（`src/modules/terminal/lib/terminalSessionApi.ts:43`）。

## 6. 验证与已知限制

- 2026-11-15：AI 模块 264 项测试通过；多行 PowerShell 命令的行序正确性需桌面端真实终端手测确认。
- 回退路径 `term.write` 仍发原始 `\n`，仅会话输入控制器缺失时触发；此时多行命令可能乱序（沿用旧行为）。
- 注入不区分隐私终端：活动标签为隐私终端时命令仍会注入 `?`。
- 命令以当前 shell 的方言为准，注入前不做方言校验或翻译。

## 7. 变更记录

- 2026-11-15：新建；登记 `injectIntoActivePty` 从裸 `term.write` 改为会话粘贴编码优先，修复多行命令在 PSReadLine 中乱序回显。
