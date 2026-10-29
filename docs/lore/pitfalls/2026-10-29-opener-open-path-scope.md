# tauri-plugin-opener 只加 allow-open-path 权限不生效：openPath 报 Not allowed to open path

- 首次出现：2026-10-29（设置页「在系统中打开」按钮点击后报错）
- 影响范围：`src-tauri/capabilities/default.json`、设置 → 模型 → 配置文件
- 复现条件：capability 里以字符串形式加入 `opener:allow-open-path` 后调用 `openPath(dir)`

## 表象

前端 `openPath("C:/Users/.../app.crynta.terax")` 抛 `Not allowed to open path C:/...`，目录不打开。

## 根因

tauri-plugin-opener 的权限与 scope 是两层：`allow-open-path` 只放行 `open_path` **命令本身**，命令内部还会用 scope 条目构造 `tauri::fs::Scope` 校验目标路径（`commands.rs` → `scope.rs::is_path_allowed`）。字符串形式的权限不带任何 scope 条目，`allowed` 列表为空，路径校验必然失败，返回 `ForbiddenPath`。

对比：`opener:default` 里的 `allow-default-urls` 自带 http/https/mailto/tel 的 scope，所以 `openUrl` 开箱可用；`openPath` 没有任何默认 scope，必须自己声明。

## 已采用的修复（已被同日的 Rust 命令方案取代）

在 capability 里把字符串权限换成带 `allow` scope 的对象形式，白名单精确到应用数据目录（`$APPDATA` 会被 `PathResolver::parse` 解析，跨平台有效）：

```json
{
  "identifier": "opener:allow-open-path",
  "allow": [
    { "path": "$APPDATA/app.crynta.terax" },
    { "path": "$APPDATA/app.crynta.terax/**" }
  ]
}
```

注意目录本身和 `/**` 子项要分开列，前者不匹配后者。scope 条目可带 `app` 字段限定打开程序，缺省匹配「默认程序」（即 `openPath` 不传 `with` 的调用方式）。

## 当前实现（2026-10-29 后续改造）

「在系统中打开」不再调用插件的 `openPath`，改由 Rust 命令 `open_ai_config_dir`（`src-tauri/src/modules/file_manager.rs`）处理：

- 目录在 Rust 侧用 `app_data_dir()` 计算，前端无法传入任意路径，因此不再需要 `opener:allow-open-path` 的 path scope；
- capability 中的 `opener:allow-open-path` 对象条目已移除，只保留 `opener:default`（`openUrl` 与 `revealItemInDir` 仍在使用）；
- 需要第三方文件管理器优先的原因见 `2026-10-29-opener-forces-explorer.md`。

上面的 scope 结论仍然有效，只是当前调用路径不再经过插件。

## 复发防护

- 规则：给 Tauri 插件加 `allow-*` 权限后，先查该插件的 permissions 目录确认命令是否还有 scope 校验层；opener 的 path/url、fs、shell 等都有 scope，字符串权限只够开门，不够放行具体目标；
- 规则：改 `capabilities/*.json` 必须重启 `tauri dev`（权限在编译期内嵌进二进制），热重载不生效；排查权限问题时先确认进程是改后重启的。
