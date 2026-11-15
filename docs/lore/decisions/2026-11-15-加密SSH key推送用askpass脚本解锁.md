# 加密 SSH key 的推送解锁采用临时 askpass 脚本

- 日期：2026-11-15
- 状态：已采纳
- 关联坑点：[pitfalls/2026-11-15-无TTY下加密SSH key被静默跳过](../pitfalls/2026-11-15-无TTY下加密SSH key被静默跳过.md)

## 背景

Terax 的 git 操作全部经 `src-tauri/src/modules/git/process.rs` 无 TTY、禁交互地 spawn，这是面板类功能避免挂死的正确基线。但加密 SSH 私钥在这个环境下无法解锁（见坑点），用户必须在 Terax 里也能推送。约束：不能为推送引入交互式终端；密码不能落盘、不进命令行参数；方案必须同时覆盖 Windows 本地与 WSL 两条 spawn 路径。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A（最终采用）：临时 askpass 脚本 + `SSH_ASKPASS_REQUIRE=force` | 纯进程内实现；密码走环境变量不进 argv；脚本 guard drop 即删；Windows `.cmd` / Unix `.sh` / WSL 经 `WSLENV` 转发已全部实测或按既有模式覆盖 | 依赖 OpenSSH ≥ 8.4 的 `SSH_ASKPASS_REQUIRE=force`（`DISPLAY` 兜底旧版）；`.cmd` 能否被 ssh 执行依赖 Git for Windows 的 MSYS ssh 行为（已用 ssh-add 实测） |
| B：预加载 ssh-agent（spawn agent + `ssh-add` 后复用 `SSH_AUTH_SOCK`） | 密码一次输入多次使用 | Windows 依赖系统 ssh-agent 服务（默认关闭）或 MSYS agent 生命周期管理；`ssh-add` 对错密码会回落 TTY 读取（实测挂起），同样要askpass，复杂度只增不减 |
| C：改用 git2/libgit2 并用 `credentials` 回调传密码 | 密码完全内存内、无临时文件 | 与现有「shelling out to git CLI」架构冲突（status/diff/log 全是 CLI），仅推送换实现会分叉行为；libssh2 对 newer OpenSSH key 格式支持滞后 |
| D：依赖用户系统 GUI askpass（如 Git for Windows 的 `git-gui--askpass`） | 零自研代码 | 弹出的是外部 GUI 窗口，体验脱节；不能保证用户环境存在该助手 |

## 结论与理由

选 A。它保持 git CLI 架构不变、改动局部（`askpass.rs` + `run_git_with_env`），密码生命周期只有一次推送（脚本临时 + 环境变量 + guard 清理），并且 WSL 路径复用了项目里成熟的 `WSLENV` 转发模式。已知妥协：密码短暂出现在 git 子进程环境变量中（同用户进程可读），与 argv 相比已是更优；SSH key 错密码时 ssh 仍报 Permission denied，用户重试即可。

**未来何时重估**：Git for Windows 默认 ssh 更换为无法执行 `.cmd` askpass 的实现、项目整体迁移到 git2/libgit2、或 Windows 自带 OpenSSH 成为 Terax 实际调用的 ssh 且行为不符时，需要重新验证并可能改选 B/C。

## 相关功能代码

- 功能文档：[atlas/features/源代码管理.md](../../atlas/features/源代码管理.md)
- 核心文件：`src-tauri/src/modules/git/askpass.rs:34`（`SshAskpass::create`）、`src-tauri/src/modules/git/operations.rs:471`（`push`）、`src/modules/source-control/SshPassphraseDialog.tsx:28`
