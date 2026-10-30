# 文件到功能反查表

> 只收录有业务含义的源文件。自动生成文件、测试、构建脚本和纯配置不在此列。
> 一个文件涉及多个功能时，第二列登记主归属，其余登记在第三列。
> 最后校验：2026-10-30

| 文件 | 主归属功能 | 次要归属 | 说明 |
|---|---|---|---|
| `src/app/App.tsx` | [开发者工具](features/开发者工具.md) | [撤销终端窗格拆分](features/撤销终端窗格拆分.md)、[终端链接打开](features/终端链接打开.md) | 注册 DevTools 处理器，协调标签页与预览打开 |
| `src/app/components/WorkspaceSurface.tsx` | [终端链接打开](features/终端链接打开.md) | 工作区渲染 | 将预览打开回调透传给终端栈 |
| `src-tauri/src/lib.rs` | [开发者工具](features/开发者工具.md) | 设置窗口、原生 IPC | 提供 `open_devtools` 命令 |
| `src/modules/shortcuts/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | [撤销终端窗格拆分](features/撤销终端窗格拆分.md)、[开发者工具](features/开发者工具.md) | 快捷键 ID、默认绑定与显示令牌 |
| `src/modules/shortcuts/lib/useGlobalShortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 全局快捷键分发 | 捕获键盘事件并派发处理器 |
| `src/modules/shortcuts/lib/useShortcutTokens.ts` | [快捷键提示](features/快捷键提示.md) | 全局快捷键分发 | 响应式读取用户覆盖并生成紧凑文本 |
| `src/modules/shortcuts/components/ShortcutTooltip.tsx` | [快捷键提示](features/快捷键提示.md) | 无 | 统一 Tooltip 与菜单快捷键文本 |
| `src/modules/shortcuts/index.ts` | [快捷键提示](features/快捷键提示.md) | 无 | 快捷键模块公共导出 |
| `src/modules/header/Header.tsx` | [快捷键提示](features/快捷键提示.md) | 顶栏布局 | 设置、侧栏、命令面板按钮提示 |
| `src/modules/header/SearchInline.tsx` | [快捷键提示](features/快捷键提示.md) | 标签内搜索 | placeholder 与标题动态显示快捷键 |
| `src/modules/tabs/NewTabMenu.tsx` | [快捷键提示](features/快捷键提示.md) | 标签页管理 | 新建标签菜单动态显示快捷键 |
| `src/modules/tabs/TabBar.tsx` | [快捷键提示](features/快捷键提示.md) | 标签页管理 | 标签关闭按钮动态标题 |
| `src/modules/ai/components/AiStatusBarControls.tsx` | [快捷键提示](features/快捷键提示.md) | AI 面板 | AI 开关与 mini 窗口提示 |
| `src/modules/explorer/FileExplorer.tsx` | [快捷键提示](features/快捷键提示.md) | 文件资源管理器 | 文件搜索按钮动态标题 |
| `src/modules/tabs/lib/useTabs.ts` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | 标签与分屏状态 | 记录拆分历史、移除叶节点并恢复焦点 |
| `src/modules/terminal/lib/panes.ts` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | [终端链接打开](features/终端链接打开.md) | 叶节点查询、拆分与移除 |
| `src/modules/terminal/lib/terminalSessionApi.ts` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | 终端会话生命周期 | 释放被撤销窗格资源 |
| `src/modules/terminal/lib/terminalLinks.ts` | [终端链接打开](features/终端链接打开.md) | 终端输入 | 定义链接修饰键与打开契约 |
| `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts` | [终端链接打开](features/终端链接打开.md) | 终端会话与渲染 | 在预览与系统浏览器之间分流 |
| `src/modules/terminal/ghostty/gpu/WebGpuTerminalSurface.ts` | [终端链接打开](features/终端链接打开.md) | 终端渲染 | WebGPU 链接点击与修饰键透传 |
| `src/modules/terminal/ghostty/webgl/WebGlTerminalSurface.ts` | [终端链接打开](features/终端链接打开.md) | 终端渲染回退 | WebGL 链接点击与修饰键透传 |
| `src/modules/terminal/TerminalPane.tsx` | [终端链接打开](features/终端链接打开.md) | 终端会话与渲染 | 单窗格预览打开回调 |
| `src/modules/terminal/PaneTreeView.tsx` | [终端链接打开](features/终端链接打开.md) | 终端分屏 | 分屏叶节点回调透传 |
| `src/modules/terminal/TerminalStack.tsx` | [终端链接打开](features/终端链接打开.md) | 标签页管理 | 标签级回调与最新引用 |
| `src/lib/external-link.ts` | [终端链接打开](features/终端链接打开.md) | 外部链接 | Ctrl 或 Cmd 分支调用系统浏览器 |
| `src/modules/preview/PreviewAddressBar.tsx` | [预览端口管理](features/预览端口管理.md) | 网页预览 | 端口菜单、添加与编辑入口 |
| `src/modules/preview/PreviewPane.tsx` | [预览端口管理](features/预览端口管理.md) | 网页预览 | 空态「端口」按钮调用地址栏 handle |
| `src/modules/preview/PortPresetDialog.tsx` | [预览端口管理](features/预览端口管理.md) | 网页预览 | 新增与编辑端口表单 |
| `src/modules/preview/lib/portPresets.ts` | [预览端口管理](features/预览端口管理.md) | 无 | 默认端口、归一化、合并与重复校验 |
| `src/modules/settings/store.ts` | [预览端口管理](features/预览端口管理.md) | 设置窗口与偏好同步 | 端口列表持久化与跨窗口广播 |
| `src/modules/i18n/locales/en/preview.ts` | [预览端口管理](features/预览端口管理.md) | 英文文案 | 端口菜单与表单文案 |
| `src/modules/i18n/locales/zh/preview.ts` | [预览端口管理](features/预览端口管理.md) | 中文文案 | 与英文词典同构 |
| `src/modules/i18n/locales/en/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 英文文案 | 快捷键名称 |
| `src/modules/i18n/locales/zh/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 中文文案 | 与英文词典同构 |
| `src/settings/sections/ShortcutsSection.tsx` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | 快捷键自定义 | 展示并保存用户覆盖键位 |
