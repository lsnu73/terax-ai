# 开发指南

- 最后校验：2026-10-30
- 验证平台：Windows 11，Git Bash

> 目标：新人照做即可跑起来。本页命令均实际执行过；唯一未执行的发布命令已显式标记。

## 前置要求

- Node.js 22 或更高版本，本机验证版本为 23.5.0。
- pnpm 11.9.0，只使用 pnpm，不混用 npm、npx 或 yarn。
- Rust stable 与 Cargo，本机验证版本为 1.98.1。
- 当前平台的 [Tauri 前置依赖](https://tauri.app/start/prerequisites/)。
- Windows 需要 WebView2；Linux 需要 GTK3 与 WebKitGTK 4.1 等桌面依赖。

## 一次性初始化

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
```

已于 2026-10-30 本机验证，锁文件未发生变化，workspace 依赖安装完成。

## 启动完整桌面应用

```bash
pnpm tauri dev
```

该命令先构建开发版 CLI sidecar，再启动 Vite 和 Rust 应用。预期看到：

- Vite 输出本地地址 `http://localhost:1420/`。
- 原生 Terax 窗口显示，而不是只打开浏览器页面。
- 启动终端出现 PTY 打开日志。

已于 2026-10-30 本机验证，Vite 就绪，`target\debug\terax.exe` 启动并成功打开首个 PowerShell PTY。验证后已停止本次启动的开发进程。日常开发结束时在启动终端按 Ctrl+C。

只需要调试前端资源图时可单独运行 `pnpm dev`，但完整 IPC、PTY 和原生窗口功能需要 `pnpm tauri dev`。

## 常用命令

以下命令均在仓库根目录执行，Rust 命令中的目录切换已写在命令内。

| 用途 | 命令 | 2026-10-30 本机结果 |
|---|---|---|
| 前端 Lint | `pnpm lint` | 命令完成，报告 79 条现有警告 |
| 类型检查 | `pnpm check-types` | 通过 |
| 前端测试 | `pnpm test` | 220 个文件通过，1 个跳过；2025 项通过，1 项跳过 |
| 前端生产构建 | `pnpm build` | 通过，产物写入 `dist/` |
| Rust Clippy | `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings` | 未通过，见环境问题排查 |
| Rust 测试 | `cd src-tauri && cargo test --locked` | 531 项通过，1 项因 Windows symlink 权限失败 |
| Atlas 漂移检查 | `bash <skill目录>/scripts/check-drift.sh <仓库根目录>` | 用法示例，路径需替换为本机实际位置 |

测试契约和需要补测试的核心子系统见 [../contributing/testing.md](../contributing/testing.md)。

## 调试

- Vite、Rust、PTY 和应用启动日志都输出在运行 `pnpm tauri dev` 的终端中。
- 主窗口保持隐藏，直到前端初始化完成后调用 `window.show()`。如果进程仍在但窗口不出现，先检查 `src/main.tsx` 的初始化是否抛出异常。
- 上述窗口问题的历史根因和排查路径见 [../lore/map.md](../lore/map.md) 的「前端主应用」条目。
- 终端性能诊断和专用 profiling 命令见 [../../TERAX.md](../../TERAX.md)，普通功能调试不必先启动这些重型工具。

## 部署发布

```bash
pnpm tauri build
```

?未经本机验证。该命令会执行 CLI release 构建、前端生产构建、Rust release 编译和安装包打包。配置声明的产物目录为 `src-tauri/target/release/bundle/`。正式发布还需要对应平台签名与更新凭据，不要在文档或命令行中写入密钥。

## 环境问题排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 进程存在但主窗口不出现 | 前端顶层初始化失败，窗口未执行到 `show()` | 查看启动终端异常，并核对 `src/main.tsx` 的初始化链 |
| Windows 提示缺少 WebView2 | 系统没有所需运行时 | 按 Tauri 指引安装 WebView2；安装器下载引导需要网络 |
| Linux 构建缺少 GTK 或 WebKitGTK | 原生依赖未安装 | 按当前发行版的 Tauri 前置依赖说明安装 |
| Clippy 在 `src-tauri/src/modules/workspace.rs:448` 报 `chunks_exact_to_as_chunks` | 当前 Rust 1.98.1 将该警告纳入检查，命令又使用 `-D warnings` | 这是当前源码验证结果，需单独修复源码后再运行，不要用文档命令绕过 |
| `authorize_spawn_cwd_blocks_symlink_escape` 报 OS error 1314 | Windows 当前用户没有创建 symlink 的权限 | 在具备 symlink 权限的测试环境重跑；本机结果为其余 531 项通过 |

## 已知环境坑

- 前端开发服务器可用不代表完整桌面应用可用，原生功能必须验证 `pnpm tauri dev`。
- Windows 的 symlink 测试权限与代码是否通过前端测试无关，Rust 测试需要单独运行。
- 不要为了让 Clippy 命令变绿而移除 `-D warnings`，应先处理具体源码告警。
