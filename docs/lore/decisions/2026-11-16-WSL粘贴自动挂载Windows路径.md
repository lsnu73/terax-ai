# WSL 粘贴自动挂载 Windows 路径

- 日期：2026-11-16
- 状态：已采纳
- 关联约束：无
- 关联坑点：无

## 背景

WSL 工作区的 shell 无法直接使用 Windows 绝对路径：`C:\Users\wang\Coding` 在 bash 里是无效路径，必须先变成 `/mnt/c/Users/wang/Coding`（挂载前缀还可能被 `/etc/wsl.conf` 的 `[automount] root` 改过）。用户希望粘贴 Windows 路径时自动补挂载前缀。应用已有 `windowsPathToWsl`（路径历史归一化在用）与按发行版缓存的 `wsl_automount_root`，缺的只是把两者接到终端粘贴入口。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| 粘贴漏斗单点转换（最终采用） | 剪贴板、原生粘贴事件、文件拖放、AI 注入一次覆盖；控制器只多一个可选回调 | 无法区分粘贴目标是否仍是 WSL shell（嵌套 ssh 远端会误转） |
| 只在剪贴板粘贴路径转换 | 改动最小 | 文件拖放在 WSL 下仍不可用；AI 注入的 Windows 路径仍失效；要按来源分别接线 |
| 在 shell 初始化脚本里包装粘贴 | 对任何输入生效 | 修改用户 shell 环境，影响提示符与既有集成；无法回退；违背「终端保持原生」 |
| 不转换，提示用户用 `wslpath` | 零风险 | 用户每次手动转换，违背需求 |

## 结论与理由

转换放在 `GhosttyInputController.paste`（全部粘贴来源的唯一漏斗），由会话创建处注入 `convertPaste`，转换函数先判 `currentWorkspaceEnv()`：非 WSL 原样返回，WSL 才解析挂载根。挂载根解析是异步的，因此粘贴按「先转换、后投递」执行（`deliverPaste`），IPC 失败或转换抛错回退原文，保证粘贴永远不丢。

转换规则只做「加挂载前缀」这一件事：盘符小写、反斜杠归一、去掉尾随分隔符；不自动加引号（带空格路径在转换前同样需要用户引号，自动加引号会在 vim/非 shell 程序中插入意外字符）。带空格的单条路径通过「整段文本是单路径」判定保持完整；长文本中的未加引号空格路径无法确定终点，只转换第一个词段，作为已知限制接受。

未来重新评估的条件：用户要求对带空格路径自动加引号，或要求本地 Windows 工作区也做反向转换（`/mnt/c` → `C:\`）；Ghostty 若提供粘贴变换的原生回调可替换本实现。

## 相关功能代码

- 功能文档：[atlas/features/终端粘贴与WSL路径转换.md](../../atlas/features/终端粘贴与WSL路径转换.md)
- 核心文件：`src/modules/terminal/lib/pastePathMount.ts`（`mountWindowsPaths`、`convertPastedTextForWorkspace`）
- 接线点：`src/modules/terminal/ghostty/input/GhosttyInputController.ts`（`paste`/`deliverPaste`）、`src/modules/terminal/ghostty/useGhosttyTerminalSession.ts`（`createGhosttyInput`）
