# AI 命令执行

- 最后校验：2026-11-12
- 状态：已覆盖
- 设计原因：[AI 命令方言在执行前注入](../../lore/decisions/2026-11-12-AI命令方言在执行前注入.md)

## 1. 业务需求

AI 可以通过 `bash_run` 执行短命令，通过 `bash_background` 启动开发服务器、监听任务等长进程。工具名中的 `bash` 是历史名称，实际命令方言由当前工作区和宿主平台决定。模型必须在第一次生成命令前知道真实 Shell，避免 Windows 本地先生成 POSIX 命令、失败后再改 PowerShell 的无效往返。

命令不做自动翻译或自动重试。失败结果保留原始输出，并附加实际 Shell 与方言提示；现有安全检查和用户审批仍在执行前生效。

## 2. 入口与调用链

- 请求上下文：`src/modules/ai/lib/transport.ts:73` 的 `createContextAwareTransport` 每次发送捕获当前 `WorkspaceEnv`，调用 `native.shellDescribe`。
- 原生描述：`src/modules/ai/lib/native.ts:209` 调用 `shell_describe`；Rust 入口位于 `src-tauri/src/modules/shell/mod.rs:468`。
- 唯一解析器：`src-tauri/src/modules/shell/mod.rs:358` 的 `resolve_oneshot_shell` 同时供元数据与真实命令构造使用。
- 首轮提示：`src/modules/ai/lib/transport.ts:146` 的 `formatEnvBlock` 注入 `shell` 和 `command_dialect`；`runAgentStream` 将同一描述传给 `buildTools`。
- 动态工具：`src/modules/ai/tools/shell.ts:73` 的 `buildShellTools` 为前台和后台工具生成方言约束。
- 执行：`src/modules/ai/tools/shell.ts` 在每次调用时捕获一个工作区快照，贯穿 describe、session open/run 或 background spawn；最终由 `build_oneshot_command` 使用同一个 Rust 解析器构造进程参数。

```text
AI 发送消息
  -> transport 捕获 WorkspaceEnv
  -> shell_describe -> resolve_oneshot_shell
  -> <env> + 动态工具描述
  -> AI 工具调用 -> 安全检查 / 审批
  -> shell_session_run 或 shell_bg_spawn
  -> 同一 resolve_oneshot_shell -> Command
```

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src/modules/ai/lib/transport.ts` | 请求上下文 | 查询 Shell 描述，注入 `<env>`，传给本轮 Agent |
| `src/modules/ai/lib/native.ts` | 原生契约 | `ShellDescription`、describe 封装及工作区快照参数 |
| `src/modules/ai/lib/agent.ts` | Agent 编排 | 将本轮 Shell 描述传给工具构建器 |
| `src/modules/ai/tools/tools.ts` | 工具组装 | 将描述传给 Shell 工具，不影响其他工具 |
| `src/modules/ai/tools/shell.ts` | 工具定义与执行 | 动态描述、工作区快照、失败提示、前台与后台调用 |
| `src-tauri/src/modules/shell/mod.rs` | Shell 事实源与进程执行 | `shell_describe`、`OneShotShell`、命令构造与输出捕获 |
| `src-tauri/src/lib.rs` | IPC 注册 | 注册 `shell_describe` |

## 4. 环境矩阵与关键流程

| 工作区 | Shell 元数据 | 命令方言 | 实际执行 |
|---|---|---|---|
| Windows Local，PowerShell 7 | `pwsh` | `powershell` | `pwsh.exe -NoProfile -Command` |
| Windows Local，Windows PowerShell | `powershell` | `powershell` | `powershell.exe -NoProfile -Command` |
| Windows Local，最后回退 | `cmd` | `cmd` | `cmd.exe /C` |
| Windows WSL | `sh` | `posix` | `wsl.exe ... --exec sh -lc` |
| macOS / Linux Local | `sh` | `posix` | `/bin/sh -c` |

1. 动态信息放在每轮用户消息的 `<env>` 和工具定义中，不放进 stable system prompt，因此 full、lite、custom 与用户覆盖提示词都能生效，也不改变稳定提示词缓存边界。
2. 工具描述明确 PowerShell、cmd 或 POSIX sh 方言；模型不需要先调用探测工具。
3. 每次工具执行重新读取当前工作区，避免 Local/WSL 切换后沿用旧环境；会话键继续包含工作区 scope。
4. `bash_run` 的非零退出、超时或执行异常，以及 `bash_background` 的启动异常，保留原结果并增加 `shell`、`command_dialect`、`hint`。
5. 成功结果不添加冗余提示；命令文本、代理注入、输出上限和审批流程保持不变。

## 5. 对外接口

- Tauri command：`shell_describe`，输入可选 `WorkspaceEnv`，返回 `ShellDescription`。
- 前端契约：`src/modules/ai/lib/native.ts` 的 `ShellDescription`，方言序列化值为 `powershell | cmd | posix`。
- 该描述接口只解析配置、PATH 与文件存在性，不启动 Shell、WSL 或 PTY，也不复用交互式终端的用户 Shell 偏好。

## 6. 验证与已知限制

- 2026-11-12：`src/modules/ai/tools/shell.test.ts` 与 `src/modules/ai/lib/transport.test.ts` 共 17 项通过，覆盖动态描述、失败提示、工作区快照和首轮环境注入。
- 2026-11-12：Rust Shell 单元测试 12 项通过，覆盖 Windows 分类、WSL argv 和前后端方言序列化契约；Unix 元数据与命令构造有一致性测试，需在 Unix 测试任务中执行。
- 后台进程启动后的非零退出仍通过 `bash_logs` 的原始 `exit_code` 展示；方言提示覆盖 `bash_run` 失败与后台启动异常，不改写日志结果。
- agent shell 跨调用保留的是 cwd，不是长期存活的 Shell 进程；环境变量、alias 和函数不跨命令保留。
- Windows 极端情况下回退 `cmd.exe` 时，持久 session 的 cwd sentinel 仍使用 PowerShell 包装，这是既有边缘限制；本次不扩大修改该执行语义。

## 7. 变更记录

- 2026-11-12：新增 Shell 描述 IPC、首轮 `<env>` 方言注入、动态前台/后台工具描述、执行工作区快照和失败修正提示；元数据与真实 argv 统一由 Rust `OneShotShell` 解析。
