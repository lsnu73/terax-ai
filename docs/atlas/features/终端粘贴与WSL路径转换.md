# 终端粘贴与 WSL 路径转换

- 最后校验：2026-11-16（@ main）
- 状态：可用
- 关联 lore：[decisions/2026-11-16-WSL粘贴自动挂载Windows路径](../../lore/decisions/2026-11-16-WSL粘贴自动挂载Windows路径.md)
- 关联文档：[终端光标与焦点](终端光标与焦点.md)（同一输入控制器）、[终端路径历史](终端路径历史.md)（共用挂载前缀与转换助手）

## 1. 业务需求

WSL 工作环境下，把 Windows 风格的绝对路径粘进终端后应当立即可用：`C:\Users\wang\Coding` 自动变为 `/mnt/c/Users/wang/Coding`，挂载前缀取自该发行版 `/etc/wsl.conf` 的 `[automount] root`（默认 `/mnt/`）。本地（Windows）工作区、非 WSL 环境以及不含 Windows 绝对路径的粘贴保持原样。所有粘贴来源统一生效：剪贴板快捷键、原生粘贴事件、文件拖放、AI 命令注入。

## 2. 入口与调用链

- 粘贴漏斗：`src/modules/terminal/ghostty/input/GhosttyInputController.ts` 的 `paste`（剪贴板快捷键、原生 `paste` 事件、`beforeinput` 的 `insertFromPaste` 都汇聚于此）。
- 转换接线：会话创建处 `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts` 的 `createGhosttyInput` 传入 `convertPaste: convertPastedTextForWorkspace`。
- 环境与挂载根：`src/modules/terminal/lib/pastePathMount.ts` 的 `convertPastedTextForWorkspace` 读取 `currentWorkspaceEnv()`，WSL 时经 `fetchWslAutomountRoot(distro)`（`src/modules/workspace/automount.ts`，按发行版缓存）取根。
- 纯转换：同文件的 `mountWindowsPaths`（复用 `src/modules/terminal/lib/pathHistory.ts` 的 `windowsPathToWsl` 与 `WSL_DEFAULT_AUTOMOUNT_ROOT`）。
- 其它粘贴来源：文件拖放 `src/modules/terminal/lib/useTerminalFileDrop.ts`、AI 命令注入 `src/modules/ai/lib/useAiLiveBridge.ts` 均经 `pasteIntoSession`（`src/modules/terminal/lib/terminalSessionApi.ts`）进入同一 `paste`。
- 写入：`deliverPaste` 用 `encodeTerminalPaste` 编码后交给会话写入线程。

调用链：

```text
剪贴板/原生粘贴/文件拖放/AI 注入
  -> GhosttyInputController.paste
  -> convertPaste (仅 WSL 环境改写 Windows 绝对路径)
  -> deliverPaste -> encodeTerminalPaste -> session writer
```

## 3. 涉及文件

| 文件 | 角色 | 备注 |
|---|---|---|
| `src/modules/terminal/lib/pastePathMount.ts` | 纯转换 + 环境包装 | `mountWindowsPaths`、`convertPastedTextForWorkspace` |
| `src/modules/terminal/ghostty/input/GhosttyInputController.ts` | 粘贴漏斗 | 新增可选 `convertPaste` 选项，转换后走 `deliverPaste` |
| `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts` | 会话接线 | `createGhosttyInput` 注入 WSL 环境转换 |
| `src/modules/workspace/automount.ts` | 挂载根解析 | `fetchWslAutomountRoot` 按发行版缓存 |
| `src/modules/terminal/lib/pathHistory.ts` | 路径工具 | `windowsPathToWsl`、`WSL_DEFAULT_AUTOMOUNT_ROOT` |

## 4. 数据流 / 关键流程

1. 粘贴文本到达 `paste`；先在调用点做选中状态重置，再进入异步转换。
2. `convertPastedTextForWorkspace`：本地环境直接返回原文；WSL 环境解析该发行版挂载根（IPC 失败回退 `/mnt/`），调用 `mountWindowsPaths`。
3. `mountWindowsPaths` 识别规则：
   - 整段文本是单条 Windows 绝对路径（无换行、无引号、仅一个盘符起点）时整体转换，含空格的路径（`C:\Program Files\My App`）保持完整。
   - 其余文本按空白/引号分词：引号内整体是盘符路径时转换并保留引号；裸盘符路径只在空白或引号边界处识别。
   - 转换：盘符小写、`\` 归一为 `/`、前置规范化挂载根、去掉尾随分隔符（`C:\` → `/mnt/c`）。
4. 转换结果经 `deliverPaste` 编码写入会话；转换抛错时回退原始文本，粘贴不丢失。

## 5. 对外接口

- 无新增 IPC：复用既有 `wsl_automount_root` 命令。
- `GhosttyInputControllerOptions` 新增可选 `convertPaste?: (text: string) => Promise<string>`；fake 模型与既有构造点无需改动。

## 6. 配置与依赖

- 挂载根来自 `/etc/wsl.conf` 的 `[automount] root`（Rust 侧 `wsl_automount_root` 读取并缓存）；无配置时 `/mnt/`。
- 转换只在粘贴时发生，无后台工作、无缓存（挂载根缓存复用既有实现）。

## 7. 已知限制与注意事项

- 带空格且未加引号的 Windows 路径出现在长文本中时只能转换第一个词段（文本无法确定路径终点）；整段粘贴单条带空格路径不受影响。
- 不做 shell 自动加引号；转换后的带空格路径需要用户自行引号包裹（与转换前一致）。
- 不处理 UNC（`\\server\share`）与 `file:` 前缀形式。
- WSL 内嵌套 ssh 到远端主机时会同样转换（终端无法区分远端 shell）；远端为 Windows 场景需手动改回。

## 8. 变更记录（功能级）

- 2026-11-16 新增终端粘贴 WSL 路径转换：WSL 环境下 Windows 绝对路径自动加挂载前缀（`C:\a\b` → `/mnt/c/a/b`），覆盖剪贴板、拖放与 AI 注入全部粘贴来源。
