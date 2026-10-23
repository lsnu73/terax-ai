# 不可违反的硬约束

每条约束带唯一编号、违反代价与代码强制点。新约束追加在末尾，编号不复用。

- **INV-001** macOS 上禁止给设置窗口同时设置 parent 与 always_on_top。
  - 违反代价：破坏 WebView 合成，设置窗口可能藏到主窗口后面（上游 issue #33、#957）。
  - 强制点：`src-tauri/src/lib.rs` 的 `open_settings_window`——当前实现完全不使用 always_on_top，从结构上杜绝该组合。

- **INV-002** 设置窗口不得以 always_on_top 浮动于其他应用之上；其层级必须与主窗口一致（主窗口的子窗口、普通层级）。
  - 违反代价：用户切换到其他软件后设置窗口仍钉在屏幕上（2026-10-23 报告的 bug）。
  - 强制点：`src-tauri/src/lib.rs` 的 `open_settings_window`（builder 不再设置 `always_on_top`，已有窗口分支不再调用 `set_always_on_top`）。
  - ⚠️ 此条暂无自动化测试强制（原 `settings_float_only_outside_macos` 测试随修复一并删除），靠代码评审把关。
