# 无 TTY 环境下加密 SSH key 被 ssh 静默跳过，推送误报 Permission denied (publickey)

- 首次出现：2026-11-15
- 影响范围：源代码管理面板的推送/获取/拉取，以及任何经 `src-tauri/src/modules/git/process.rs` 走 SSH 远程的 git 操作；用户私钥带 passphrase 时必现
- 复现条件：加密的 SSH 私钥 + Terax 内触发的 git push（终端外直接跑同一命令则正常，因为终端有 TTY 可以提示）

## 表象

面板通知/footer 收到「authentication required: git@github.com: Permission denied (publickey).. Configure a credential helper or SSH key.」。同一台机器、同一把 key 在用户终端里 `git push` 一切正常。该报错与「key 未在远端注册」完全相同，从 stderr 无法区分是解密失败还是授权失败；`ssh -v` 里三种情况（无 askpass、错密码、对端拒绝）都只出现 `Offering public key` + `Permission denied (publickey)`。

## 根因

`run_git_uncached` 以 `Stdio::null()` 无 TTY spawn git，并设置 `GIT_TERMINAL_PROMPT=0`、清空 `SSH_ASKPASS`，让任何凭据提示立即失败。OpenSSH 在无法提示时对加密私钥的处置是**静默跳过该 key**（不是报「需要密码」），继续尝试其余身份，最后统一报 `Permission denied (publickey)`。因此报错的第一因不是认证被拒，而是 key 根本没有被解锁使用。

## 已采用的修复

前端 `useSourceControl.ts` 的 `isSshAuthError` 识别该错误形状，弹出 `SshPassphraseDialog` 让用户输入 key 密码；Rust 侧 `operations::push` 带密码时经 `askpass.rs` 的 `SshAskpass` 写临时 askpass 脚本并以 `SSH_ASKPASS_REQUIRE=force` 重试。askpass 机制本身已用加密测试密钥 + `ssh-add` 实测验证：`.cmd` 与 `.sh` 助手均能让 Git for Windows 自带的 ssh（MSYS OpenSSH 10）完成解密，错密码则仍报 Permission denied（此时走通知）。

## 复发防护

- `askpass.rs` 三个单元测试锁定脚本内容、环境变量与 drop 清理；`useSourceControl.test.ts` 锁定 `isSshAuthError` 的正负样本。
- `process.rs` 的禁交互基线是本坑的成因：新增 git 环境变量时不得把 askpass 相关变量的叠加顺序放到基线之前，也不得清掉 `SSH_ASKPASS_REQUIRE`/`DISPLAY` 的兜底注入，见 map.md 源代码管理条目的两条隐性依赖。

## 相关功能代码

- 功能文档：[atlas/features/源代码管理.md](../../atlas/features/源代码管理.md)
- 触发位置：`src-tauri/src/modules/git/process.rs:300`（`run_git_uncached` 禁交互基线）
- 修复位置：`src/modules/source-control/useSourceControl.ts:211`（`isSshAuthError`）、`src-tauri/src/modules/git/askpass.rs:34`（`SshAskpass::create`）
