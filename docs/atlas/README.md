# Terax 项目地图

> 本目录回答「代码做了什么、在哪里」。设计理由、硬约束与历史坑点见 [../lore/](../lore/)。
> 最后校验：2026-11-02

## 一句话

Terax 是面向开发者的开源桌面开发工作区，以终端为中心，集成 AI 编码代理、编辑器、文件管理、Git 和网页预览。

## 怎么读

1. [overview.md](overview.md)：项目边界与核心术语。
2. [architecture.md](architecture.md)：技术栈、进程边界与目录职责。
3. [getting-started.md](getting-started.md)：安装、启动、检查与排障。
4. [features/_index.md](features/_index.md)：功能清单与文档覆盖度。
5. [file-map.md](file-map.md)：从源文件反查业务功能。

仓库的架构事实来源仍是 [../../TERAX.md](../../TERAX.md)，专题长文从 [../README.md](../README.md) 进入。Atlas 提供定位入口，不替代这些文档。

## 我要改 X，该看哪里

| 我的意图 | 先看 | 关键文件 |
|---|---|---|
| 改撤销终端窗格拆分 | [features/撤销终端窗格拆分.md](features/撤销终端窗格拆分.md) | `src/app/App.tsx`, `src/modules/tabs/lib/useTabs.ts` |
| 调整撤销拆分的默认键位 | [features/撤销终端窗格拆分.md](features/撤销终端窗格拆分.md) | `src/modules/shortcuts/shortcuts.ts` |
| 改主窗口开发者工具入口 | [features/开发者工具.md](features/开发者工具.md) | `src-tauri/src/lib.rs`, `src/app/App.tsx` |
| 改终端 URL 的打开方式 | [features/终端链接打开.md](features/终端链接打开.md) | `src/modules/terminal/lib/terminalLinks.ts`, `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts` |
| 改终端命令块、块右键菜单或历史搜索 | [features/终端命令与结果块.md](features/终端命令与结果块.md) | `src/modules/terminal/TerminalPane.tsx`, `src/modules/terminal/ghostty/GhosttyBlocks.ts` |
| 改预览端口菜单或预设 | [features/预览端口管理.md](features/预览端口管理.md) | `src/modules/preview/PreviewAddressBar.tsx`, `src/modules/preview/lib/portPresets.ts` |
| 改命令面板命令或搜索模式 | [features/命令面板.md](features/命令面板.md) | `src/modules/command-palette/CommandPalette.tsx`, `src/modules/command-palette/commands.ts` |
| 改按钮悬浮提示的快捷键格式 | [features/快捷键提示.md](features/快捷键提示.md) | `src/modules/shortcuts/components/ShortcutTooltip.tsx` |
| 改 AI 面板或 Composer | [features/AI面板.md](features/AI面板.md) | `src/modules/ai/components/AiPanel.tsx`, `src/modules/ai/store/aiPanelStore.ts` |
| 改 AI 生成提交信息或其提示词 | [features/AI提交信息生成.md](features/AI提交信息生成.md) | `src/modules/source-control/useSourceControlPanel.ts`, `src/modules/ai/config/prompts.ts` |
| 改模型请求参数或思考强度档位 | [features/AI模型配置.md](features/AI模型配置.md) | `src/modules/ai/config/params.ts`, `src/settings/sections/models/StructuredFields.tsx` |
| 改设置分区导航、选项搜索或结果定位 | [features/设置页.md](features/设置页.md) | `src/settings/SettingsView.tsx`, `src/settings/components/SettingsSearch.tsx`, `src/settings/settingsSearch.ts` |
| 改关于页链接或检查更新入口 | [features/设置-关于.md](features/设置-关于.md) | `src/settings/sections/AboutSection.tsx`, `src/modules/updater/useUpdater.ts` |
| 改代理设置或三场景代理生效 | [features/代理.md](features/代理.md) | `src/settings/sections/ProxySection.tsx`, `src/modules/proxy/lib/proxy.ts` |
| 改终端链接打开方式（URL/路径） | [features/终端链接打开.md](features/终端链接打开.md) | `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts`, `src/lib/open-path.ts` |
| 改最近路径弹窗或目录历史 | [features/终端路径历史.md](features/终端路径历史.md) | `src/modules/terminal/path-history/PathHistoryDialog.tsx`, `src/modules/terminal/lib/pathHistory.ts` |
| 项目跑不起来 | [getting-started.md](getting-started.md) | `package.json`, `src-tauri/tauri.conf.json` |
| 不知道某文件干嘛的 | [file-map.md](file-map.md) | 无 |
| 查设计理由或硬约束 | [../lore/README.md](../lore/README.md) | 无 |

## 当前覆盖范围

首版采用种子功能法，之后按开发增量补齐。目前完整覆盖「撤销终端窗格拆分」「开发者工具」「终端链接打开」「终端路径历史」「终端命令与结果块」「预览端口管理」「快捷键提示」「AI 面板」「AI 模型配置」「命令面板」「AI 提交信息生成」「设置-关于」「代理」「设置页」十四个功能。其他功能在 [features/_index.md](features/_index.md) 中登记为未覆盖，后续随开发补齐，不以目录名推测实现。

## 协作约定

- 修改代码前先读 [../../TERAX.md](../../TERAX.md) 和 [../../CONTRIBUTING.md](../../CONTRIBUTING.md)。
- 从 `main` 切功能分支，分支名使用 `feat/`、`fix/`、`docs/` 等约定前缀。
- 提交标题遵循 Conventional Commits，描述可使用中文。
- `src/components/ui/` 与 `src/components/ai-elements/` 由注册表生成，不直接手改。
- 前端跨模块导入使用 `@/` 别名，包管理器只使用 pnpm。
