# Terax 项目地图

> 本目录回答「代码做了什么、在哪里」。设计理由、硬约束与历史坑点见 [../lore/](../lore/)。
> 最后校验：2026-11-08

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
| 改输入法候选窗跟随终端光标的行为 | [features/终端输入法候选框定位.md](features/终端输入法候选框定位.md) | `src/modules/terminal/ghostty/gpu/WebGpuTerminalSurface.ts`, `src/modules/terminal/ghostty/webgl/WebGlTerminalSurface.ts` |
| 改终端命令块、命令时间线、块右键菜单、块内查找或历史搜索 | [features/终端命令与结果块.md](features/终端命令与结果块.md) | `src/modules/terminal/block/CommandTimeline.tsx`, `src/modules/terminal/TerminalPane.tsx`, `src/modules/terminal/ghostty/GhosttyBlocks.ts` |
| 改标签栏、标签右键菜单或新建标签入口 | [features/标签页管理.md](features/标签页管理.md) | `src/modules/tabs/TabBar.tsx`, `src/modules/tabs/NewTabMenu.tsx`, `src/modules/tabs/lib/useTabs.ts` |
| 改预览端口菜单或预设 | [features/预览端口管理.md](features/预览端口管理.md) | `src/modules/preview/PreviewAddressBar.tsx`, `src/modules/preview/lib/portPresets.ts` |
| 改命令面板命令或搜索模式 | [features/命令面板.md](features/命令面板.md) | `src/modules/command-palette/CommandPalette.tsx`, `src/modules/command-palette/commands.ts` |
| 改文件搜索结果树或文件搜索交互 | [features/文件资源管理器.md](features/文件资源管理器.md) | `src/modules/explorer/ExplorerSearch.tsx`, `src/modules/explorer/lib/searchTree.ts` |
| 改按钮悬浮提示的快捷键格式 | [features/快捷键提示.md](features/快捷键提示.md) | `src/modules/shortcuts/components/ShortcutTooltip.tsx` |
| 改 AI 面板、对话或 Composer | [features/AI面板.md](features/AI面板.md) | `src/modules/ai/components/AiPanel.tsx`, `src/modules/ai/components/AiChat.tsx`, `src/modules/ai/lib/composer.tsx`, `src/modules/ai/store/aiPanelStore.ts` |
| 改 AI 面板附件展示、附件读取或拖拽附加 | [features/AI面板.md](features/AI面板.md) | `src/modules/ai/lib/composer.tsx`, `src/modules/ai/lib/aiAttachmentDrop.ts`, `src/modules/explorer/lib/useExplorerDnd.ts` |
| 改 AI 生成提交信息或其提示词 | [features/AI提交信息生成.md](features/AI提交信息生成.md) | `src/modules/source-control/useSourceControlPanel.ts`, `src/modules/ai/config/prompts.ts` |
| 改模型请求参数或思考强度档位 | [features/AI模型配置.md](features/AI模型配置.md) | `src/modules/ai/config/params.ts`, `src/settings/sections/models/StructuredFields.tsx` |
| 改通知铃铛、软件运行消息或通知显示方式 | [features/通知中心.md](features/通知中心.md) | `src/modules/agents/components/NotificationBell.tsx`, `src/modules/agents/lib/runtimeNotifications.ts`, `src/modules/agents/store/agentStore.ts` |
| 改设置左侧导航、选项搜索、结果分组或结果定位 | [features/设置页.md](features/设置页.md) | `src/settings/SettingsView.tsx`, `src/settings/components/SettingsSearch.tsx`, `src/settings/settingsSearch.ts` |
| 改 Ctrl+F 的归属、设置页搜索聚焦或预览页查找 | [features/标签内搜索.md](features/标签内搜索.md) | `src/app/App.tsx`, `src/modules/header/SearchInline.tsx`, `src/settings/settingsSearchFocus.ts` |
| 改关闭按钮行为、退出确认、系统托盘或二次启动唤回 | [features/关闭窗口与系统托盘.md](features/关闭窗口与系统托盘.md) | `src/app/hooks/useAppCloseGuard.ts`, `src-tauri/src/modules/tray.rs`, `src-tauri/src/modules/single_instance.rs`, `src/app/components/CloseDialogs.tsx` |
| 改窗口圆角/最大化直角、窗口控制按钮点击区或左右边框拖拽阀 | [features/无边框窗口与边框交互.md](features/无边框窗口与边框交互.md) | `src/app/components/WindowEdgeValves.tsx`, `src/lib/maximizedChrome.ts`, `src/styles/globals.css`, `src/components/WindowControls.tsx` |
| 改关于页的文件/注册表痕迹清单 | [features/设置-关于.md](features/设置-关于.md) | `src-tauri/src/modules/traces.rs`, `src/settings/sections/AboutSection.tsx` |
| 改关于页链接、检查更新入口、版本同步或标签发布 | [features/设置-关于.md](features/设置-关于.md) | `src/settings/sections/AboutSection.tsx`, `src/modules/updater/useUpdater.ts`, `scripts/release-version.mjs` |
| 改启动自动检查更新、更新提示消息或关于页一键更新 | [features/应用更新.md](features/应用更新.md) | `src/modules/updater/useUpdater.ts`, `src/app/App.tsx`, `src/settings/sections/AboutSection.tsx`, `src/settings/sections/GeneralSection.tsx` |
| 改代理设置或三场景代理生效 | [features/代理.md](features/代理.md) | `src/settings/sections/ProxySection.tsx`, `src/modules/proxy/lib/proxy.ts`, `src/modules/proxy/lib/terminalProxyRegistry.ts` |
| 改终端链接打开方式（URL/路径） | [features/终端链接打开.md](features/终端链接打开.md) | `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts`, `src/lib/open-path.ts` |
| 改最近路径弹窗或目录历史 | [features/终端路径历史.md](features/终端路径历史.md) | `src/modules/terminal/path-history/PathHistoryDialog.tsx`, `src/modules/terminal/lib/pathHistory.ts` |
| 项目跑不起来 | [getting-started.md](getting-started.md) | `package.json`, `src-tauri/tauri.conf.json` |
| 不知道某文件干嘛的 | [file-map.md](file-map.md) | 无 |
| 查设计理由或硬约束 | [../lore/README.md](../lore/README.md) | 无 |

## 当前覆盖范围

首版采用种子功能法，之后按开发增量补齐。目前完整覆盖「撤销终端窗格拆分」「开发者工具」「终端链接打开」「终端输入法候选框定位」「终端路径历史」「终端命令与结果块」「标签页管理」「标签内搜索」「关闭窗口与系统托盘」「无边框窗口与边框交互」「预览端口管理」「快捷键提示」「AI 面板」「AI 模型配置」「命令面板」「AI 提交信息生成」「设置-关于」「代理」「设置页」「通知中心」「文件资源管理器」「应用更新」二十二个功能。其他功能在 [features/_index.md](features/_index.md) 中登记为未覆盖，后续随开发补齐，不以目录名推测实现。

## 协作约定

- 修改代码前先读 [../../TERAX.md](../../TERAX.md) 和 [../../CONTRIBUTING.md](../../CONTRIBUTING.md)。
- 从 `main` 切功能分支，分支名使用 `feat/`、`fix/`、`docs/` 等约定前缀。
- 提交标题遵循 Conventional Commits，描述可使用中文。
- `src/components/ui/` 与 `src/components/ai-elements/` 由注册表生成，不直接手改。
- 前端跨模块导入使用 `@/` 别名，包管理器只使用 pnpm。
