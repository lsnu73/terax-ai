# 术语 ↔ 代码实体对照

- **设置窗口 / Settings 窗口**：Tauri 的第二个 webview 窗口，label 为 `"settings"`，前端入口 `src/settings/main.tsx`（HTML 入口 `settings.html`），由 `open_settings_window` 命令创建。易与主窗口内的「设置 store」（`src/modules/settings/store.ts`，偏好存取层）混淆——前者是窗口，后者是数据层，两个 webview 都在用。
- **主窗口**：label 为 `"main"` 的 webview 窗口，前端入口 `src/main.tsx` + `src/app/App.tsx`。
- **sidecar**：随主程序分发的辅助可执行文件。本项目指 `terax-cli-<target-triple>(.exe)`，构建期由 `scripts/build-cli.mjs` 产出到 `src-tauri/binaries/`。
- **beforeBuildCommand**：`tauri.conf.json` 中 `pnpm tauri build` 正式编译前执行的命令，本项目为 `pnpm build:cli && pnpm build`。
- **terax-control-protocol**：`src-tauri/crates/terax-control-protocol/`，CLI 与主程序共用的控制协议 crate。
