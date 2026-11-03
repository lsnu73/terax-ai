# openPath / revealItemInDir 在 Windows 上固定打开资源管理器，忽略第三方文件管理器

- 首次出现：2026-10-29（设置页「在系统中打开」需求：有第三方文件管理器就优先用第三方）
- 影响范围：`src-tauri/src/modules/file_manager.rs`、设置 → 模型 → 配置文件
- 复现条件：系统已注册第三方文件管理器（如 One Commander、Total Commander、Directory Opus），调用 `openPath(dir)`

## 表象

无论 `HKCR\Directory\shell` 的默认动词指向什么，点击按钮都只弹出 Windows 资源管理器。

## 根因

`tauri-plugin-opener` 最终使用 `open` crate（`shellexecute-on-windows` feature）。`open::that_detached` 对目录先调用 `SHOpenFolderAndSelectItems`，该 API 只会打开 Explorer；失败后才走 `ShellExecuteExW`，但显式使用 `explore` 动词 + `Folder` 类，同样是 Explorer 专用。第三方管理器通常只注册 `Directory\shell` 的默认动词（例如 `OpenInOneCommander`），这两条路径都不会采用它。

`revealItemInDir` 是同一类问题：它的语义就是「在系统资源管理器中显示」。

## 已采用的修复

新增 Rust 命令 `open_ai_config_dir`（`src-tauri/src/modules/file_manager.rs`）：

1. 读 `HKCR\Directory\shell`，再读 `HKCR\Folder\shell` 的默认动词及其 `command`；如果指向的 exe 不是 `explorer.exe`，直接启动它（用户已把第三方设为默认）；
2. 否则按 App Paths 与常见安装目录探测 One Commander、Directory Opus、Total Commander、XYplorer、Q-Dir、FreeCommander；
3. 都没有才回退 `explorer.exe`。

命令模板里的 `%1` / `%L` / `%V` / `%d` 占位符会替换为目录；没有占位符时把目录追加为参数（Explorer 的 `Folder\shell\open\command` 就是这种写法）。

## 复发防护

- 规则：不要用 `openPath` / `revealItemInDir` 实现「打开目录」，它们在 Windows 上都是 Explorer 专用；需要尊重用户文件管理器时走 `file_manager.rs`；
- 规则：注册表 command 可能是不带引号的含空格路径（便携版安装器的常见写法），解析时必须按 token 前缀逐步探测真实可执行文件，不能简单按第一个空格切分；
- 已验证：`file_manager.rs` 的单测覆盖带引号/不带引号路径、无占位符追加目录、`%VAR%` 展开与未知百分号保留。
