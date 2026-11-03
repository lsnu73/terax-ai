# 文件到功能反查表

> 只收录有业务含义的源文件。自动生成文件、测试、构建脚本和纯配置不在此列。
> 一个文件涉及多个功能时，第二列登记主归属，其余登记在第三列。
> 最后校验：2026-11-02

| 文件 | 主归属功能 | 次要归属 | 说明 |
|---|---|---|---|
| `src/app/App.tsx` | [开发者工具](features/开发者工具.md) | [撤销终端窗格拆分](features/撤销终端窗格拆分.md)、[终端链接打开](features/终端链接打开.md)、[终端命令与结果块](features/终端命令与结果块.md) | 注册 DevTools 处理器，协调标签页、预览与共享搜索目标 |
| `src/app/components/WorkspaceSurface.tsx` | [终端链接打开](features/终端链接打开.md) | 工作区渲染、[设置页](features/设置页.md)、[终端命令与结果块](features/终端命令与结果块.md) | 透传预览与块搜索回调，并在工作区层渲染设置页 |
| `src-tauri/src/lib.rs` | [开发者工具](features/开发者工具.md) | 设置窗口、原生 IPC | 提供 `open_devtools` 命令 |
| `src/modules/shortcuts/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | [撤销终端窗格拆分](features/撤销终端窗格拆分.md)、[开发者工具](features/开发者工具.md)、[终端命令与结果块](features/终端命令与结果块.md)、[设置页](features/设置页.md) | 快捷键 ID、默认绑定、显示令牌、Ctrl+R 保留判定与设置搜索快捷键索引来源 |
| `src/modules/shortcuts/lib/useGlobalShortcuts.ts` | [快捷键提示](features/快捷键提示.md) | [终端命令与结果块](features/终端命令与结果块.md) | 捕获键盘事件、派发处理器并跳过 Ctrl+R |
| `src/modules/shortcuts/lib/useShortcutTokens.ts` | [快捷键提示](features/快捷键提示.md) | 全局快捷键分发 | 响应式读取用户覆盖并生成紧凑文本 |
| `src/modules/shortcuts/components/ShortcutTooltip.tsx` | [快捷键提示](features/快捷键提示.md) | 无 | 统一 Tooltip 与菜单快捷键文本 |
| `src/modules/shortcuts/index.ts` | [快捷键提示](features/快捷键提示.md) | 无 | 快捷键模块公共导出 |
| `src/modules/header/Header.tsx` | [快捷键提示](features/快捷键提示.md) | 顶栏布局、[通知中心](features/通知中心.md) | 设置、侧栏、命令面板按钮提示与通知铃铛入口 |
| `src/modules/agents/components/NotificationBell.tsx` | [通知中心](features/通知中心.md) | 外部编码代理管理 | 未读角标、通知历史、详情、Agent 跳转与运行时动作 |
| `src/modules/agents/lib/runtimeNotifications.ts` | [通知中心](features/通知中心.md) | 无 | 软件消息统一入口与 Sonner/历史生命周期协调 |
| `src/modules/agents/lib/types.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | Agent/运行时通知联合类型 |
| `src/modules/agents/store/agentStore.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | 活跃 Agent、50 条通知历史、已读与稳定 ID 更新 |
| `src/modules/agents/lib/route.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | Agent 通知送达、正文入队和应用内显示方式 |
| `src/modules/header/SearchInline.tsx` | [快捷键提示](features/快捷键提示.md) | 标签内搜索、[终端命令与结果块](features/终端命令与结果块.md) | Ctrl+F 与命令块查找共用的弹窗，按 target 切换全文或局部控制器 |
| `src/modules/tabs/NewTabMenu.tsx` | [标签页管理](features/标签页管理.md) | [快捷键提示](features/快捷键提示.md) | 新建标签类型与编码代理启动入口，菜单显示快捷键 |
| `src/modules/tabs/TabBar.tsx` | [标签页管理](features/标签页管理.md) | [快捷键提示](features/快捷键提示.md) | 标签栏、受控右键菜单与捕获阶段外部点击关闭 |
| `src/modules/ai/components/AiOpenButton.tsx` | [快捷键提示](features/快捷键提示.md) | [独立AI窗口](features/独立AI窗口.md) | 状态栏 AI 开关与动态快捷键提示 |
| `src/modules/ai/components/AiPanel.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 右侧面板页面：聊天、会话、计划横幅与空态；接入失败回合重试 |
| `src/modules/ai/components/AiChat.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 消息渲染、请求失败展示、重试与关闭操作 |
| `src/modules/ai/components/AiPanelComposer.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 完整 Composer 与 prefill；元信息行组装 |
| `src/modules/ai/components/ApprovalModeToggle.tsx` | [AI面板](features/AI面板.md) | AI 对话与工具审批 | 执行审批模式切换（review/auto） |
| `src/modules/ai/lib/approvalMode.ts` | [AI面板](features/AI面板.md) | AI 对话与工具审批 | 工具 needsApproval 按偏好动态判定 |
| `src/modules/ai/components/AgentRunBridge.tsx` | [AI面板](features/AI面板.md) | AI 对话与工具审批 | 主窗口唯一聊天引擎、agentMeta 与持久化、AI diff tab 管理 |
| `src/modules/ai/lib/aiPanel.ts` | [AI面板](features/AI面板.md) | 选区与文件 prefill | 面板开关封装与 Provider 检查 |
| `src/modules/ai/store/aiPanelStore.ts` | [AI面板](features/AI面板.md) | 无 | 面板开关与 prefill 状态 |
| `src/modules/ai/lib/aiPanelBridge.ts` | [AI面板](features/AI面板.md) | 无 | prefill 类型契约 |
| `src/modules/ai/lib/composerMessage.ts` | [AI面板](features/AI面板.md) | AI 对话 | Composer 到 AI SDK parts 的纯转换 |
| `src/modules/explorer/FileExplorer.tsx` | [快捷键提示](features/快捷键提示.md) | 文件资源管理器 | 文件搜索按钮动态标题 |
| `src/modules/tabs/lib/useTabs.ts` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | [终端命令与结果块](features/终端命令与结果块.md)、标签与分屏状态、[AI面板](features/AI面板.md) | 记录拆分历史、恢复焦点、维护终端标签与 settings tab 单例 |
| `src/modules/terminal/lib/panes.ts` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | [终端链接打开](features/终端链接打开.md) | 叶节点查询、拆分与移除 |
| `src/modules/terminal/lib/terminalSessionApi.ts` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | 终端会话生命周期、[代理](features/代理.md) | 释放被撤销窗格资源；`restartSession`/`restartAllSessions` 刷新终端让新设置生效 |
| `src/modules/terminal/lib/terminalLinks.ts` | [终端链接打开](features/终端链接打开.md) | 终端输入 | 定义链接修饰键与打开契约 |
| `src/modules/terminal/ghostty/useGhosttyTerminalSession.ts` | [终端链接打开](features/终端链接打开.md) | [终端命令与结果块](features/终端命令与结果块.md)、终端会话与渲染 | 分流链接并为所有终端初始化块会话 |
| `src/modules/terminal/lib/blockAnchorProbe.ts` | [终端命令与结果块](features/终端命令与结果块.md) | 终端会话与渲染 | 检测会话缺失 OSC 133;C 命令锚点（PS 5.1 无 PSReadLine 时提示安装） |
| `src/modules/terminal/ghostty/gpu/WebGpuTerminalSurface.ts` | [终端链接打开](features/终端链接打开.md) | [终端输入法候选框定位](features/终端输入法候选框定位.md)、终端渲染 | WebGPU 链接点击、修饰键透传与输入法锚点同步 |
| `src/modules/terminal/ghostty/webgl/WebGlTerminalSurface.ts` | [终端链接打开](features/终端链接打开.md) | [终端输入法候选框定位](features/终端输入法候选框定位.md)、终端渲染回退 | WebGL 链接点击、修饰键透传与输入法锚点同步 |
| `src/modules/terminal/TerminalPane.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | [终端链接打开](features/终端链接打开.md)、终端会话与渲染 | 选区优先、块右键命中，创建局部搜索控制器并打开共享弹窗 |
| `src/modules/terminal/block/BlockContextMenu.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | AI prefill 与剪贴板 | 六项块操作右键菜单 |
| `src/modules/terminal/block/BlockOverlay.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | 终端块展示 | 块尾分隔线、失败退出码；块清空时关闭共享搜索 |
| `src/modules/terminal/ghostty/GhosttyBlocks.ts` | [终端命令与结果块](features/终端命令与结果块.md) | Ghostty model 适配 | OSC 133 块边界、读取、局部文本/正则搜索与右键命中 |
| `src/modules/terminal/ghostty/search/GhosttyBlockSearchController.ts` | [终端命令与结果块](features/终端命令与结果块.md) | 标签内搜索 | 把异步块扫描、取消和匹配导航适配为 TerminalSearchController |
| `src/modules/terminal/ghostty/GhosttyBlockOverlay.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | 会话桥接 | 连接块控制器与覆盖层，清块时关闭共享搜索 |
| `src-tauri/src/modules/pty/scripts/profile.ps1` | [终端命令与结果块](features/终端命令与结果块.md) | PowerShell 集成 | OSC 133 标记、命令行上报与块头间隔空行 |
| `src-tauri/src/modules/pty/scripts/zshrc.zsh` | [终端命令与结果块](features/终端命令与结果块.md) | zsh 集成 | OSC 133 标记、命令行上报与块头间隔空行 |
| `src-tauri/src/modules/pty/scripts/bashrc.bash` | [终端命令与结果块](features/终端命令与结果块.md) | bash 集成 | OSC 133 标记、PS0 预执行与块头间隔空行 |
| `src-tauri/src/modules/pty/scripts/init.fish` | [终端命令与结果块](features/终端命令与结果块.md) | fish 集成 | OSC 133 标记、命令行上报与块头间隔空行 |
| `src/modules/terminal/PaneTreeView.tsx` | [终端链接打开](features/终端链接打开.md) | 终端分屏、[终端命令与结果块](features/终端命令与结果块.md) | 分屏叶节点与块搜索回调透传 |
| `src/modules/terminal/TerminalStack.tsx` | [终端链接打开](features/终端链接打开.md) | 标签页管理、[终端命令与结果块](features/终端命令与结果块.md) | 标签级回调与块搜索回调最新引用 |
| `src/lib/external-link.ts` | [终端链接打开](features/终端链接打开.md) | 外部链接 | Ctrl 或 Cmd 分支调用系统浏览器 |
| `src/modules/preview/PreviewAddressBar.tsx` | [预览端口管理](features/预览端口管理.md) | 网页预览 | 端口菜单、添加与编辑入口 |
| `src/modules/preview/PreviewPane.tsx` | [预览端口管理](features/预览端口管理.md) | 网页预览 | 空态「端口」按钮调用地址栏 handle |
| `src/modules/preview/PortPresetDialog.tsx` | [预览端口管理](features/预览端口管理.md) | 网页预览 | 新增与编辑端口表单 |
| `src/modules/preview/lib/portPresets.ts` | [预览端口管理](features/预览端口管理.md) | 无 | 默认端口、归一化、合并与重复校验 |
| `src/modules/settings/store.ts` | [预览端口管理](features/预览端口管理.md) | 设置窗口与偏好同步、[通知中心](features/通知中心.md) | 端口列表、通知显示方式持久化与跨窗口广播 |
| `src/modules/i18n/locales/en/preview.ts` | [预览端口管理](features/预览端口管理.md) | 英文文案 | 端口菜单与表单文案 |
| `src/modules/i18n/locales/zh/preview.ts` | [预览端口管理](features/预览端口管理.md) | 中文文案 | 与英文词典同构 |
| `src/modules/i18n/locales/en/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 英文文案 | 快捷键名称 |
| `src/modules/i18n/locales/zh/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 中文文案 | 与英文词典同构 |
| `src/settings/SettingsView.tsx` | [设置页](features/设置页.md) | 偏好同步 | 设置页分区导航、搜索工具栏、结果定位与高亮 |
| `src/settings/components/SettingsSearch.tsx` | [设置页](features/设置页.md) | 无 | 跨分区查询、翻译后过滤与结果键盘交互 |
| `src/settings/settingsSearch.ts` | [设置页](features/设置页.md) | 无 | 设置搜索静态索引、目标 ID、关键词与条件可见性 |
| `src/settings/components/SettingRow.tsx` | [设置页](features/设置页.md) | 无 | 普通设置行布局与可选搜索锚点 |
| `src/settings/sections/GeneralSection.tsx` | [设置页](features/设置页.md) | 通用偏好 | 通用设置 UI 与搜索锚点 |
| `src/settings/sections/EditorSection.tsx` | [设置页](features/设置页.md) | 编辑器偏好 | 编辑器设置 UI、条件选项与搜索锚点 |
| `src/settings/sections/ThemesSection.tsx` | [设置页](features/设置页.md) | 主题与窗口外观 | 主题、编辑器主题和背景设置锚点 |
| `src/settings/components/LspServersGroup.tsx` | [设置页](features/设置页.md) | LSP 语言服务 | 语言服务器区域入口与搜索锚点 |
| `src/modules/i18n/locales/en/settings/search.ts` | [设置页](features/设置页.md) | 英文文案 | 设置搜索 placeholder、无障碍名称与空结果 |
| `src/modules/i18n/locales/zh/settings/search.ts` | [设置页](features/设置页.md) | 中文文案 | 与英文同构的设置搜索文案 |
| `src/modules/ai/config/types.ts` | [AI模型配置](features/AI模型配置.md) | 无 | `ParamDef` / `EffortConfig` 等数据模型 |
| `src/modules/ai/config/defaults.ts` | [AI模型配置](features/AI模型配置.md) | 无 | 内置厂商目录与思考强度档位 |
| `src/modules/ai/config/normalize.ts` | [AI模型配置](features/AI模型配置.md) | 无 | 配置收敛与旧 thinking/ParamDef 迁移 |
| `src/modules/ai/config/params.ts` | [AI模型配置](features/AI模型配置.md) | AI 对话与工具审批 | 请求参数引擎：params、effort 档位、extra 合并 |
| `src/modules/ai/config/persist.ts` | [AI模型配置](features/AI模型配置.md) | 无 | terax-ai-models.json 读写 |
| `src/modules/ai/lib/agent.ts` | [AI模型配置](features/AI模型配置.md) | AI 对话与工具审批 | withRequestParams 把解析后的参数合并进出站请求 |
| `src/settings/sections/ModelsSection.tsx` | [AI模型配置](features/AI模型配置.md) | [设置页](features/设置页.md) | 模型/Provider 编辑器、校验与配置/默认项/Provider 搜索锚点 |
| `src/settings/sections/models/StructuredFields.tsx` | [AI模型配置](features/AI模型配置.md) | [设置页](features/设置页.md) | ParamsForm / EffortForm 等结构化表单 |
| `src/modules/ai/components/ModelPicker.tsx` | [AI模型配置](features/AI模型配置.md) | AI 面板 | 思考强度滑条与模型选择 |
| `src/modules/i18n/locales/en/settings/models.ts` | [AI模型配置](features/AI模型配置.md) | 英文文案 | Params/Effort 字段与规则文案 |
| `src/modules/terminal/ghostty/core/terminalLinks.ts` | [终端链接打开](features/终端链接打开.md) | 终端路径历史 | URL 与绝对路径文本检测 |
| `src/lib/open-path.ts` | [终端链接打开](features/终端链接打开.md) | 终端路径历史 | 路径识别与文件管理器打开 |
| `src-tauri/src/modules/file_manager.rs` | [终端链接打开](features/终端链接打开.md) | 无 | 第三方文件管理器探测与打开命令 |
| `src/modules/terminal/lib/terminalCd.ts` | [终端路径历史](features/终端路径历史.md) | [终端链接打开](features/终端链接打开.md) | cd 命令构造与提交 |
| `src/modules/terminal/lib/pathHistory.ts` | [终端路径历史](features/终端路径历史.md) | 无 | 目录历史记录/封顶/筛选规则 |
| `src/modules/terminal/path-history/PathHistoryDialog.tsx` | [终端路径历史](features/终端路径历史.md) | 无 | Ctrl+E 最近路径弹窗 |
| `src/modules/command-palette/lib/mode.ts` | [终端路径历史](features/终端路径历史.md) | [命令面板](features/命令面板.md) | 面板 `>` 前缀路径模式解析 |
| `src/modules/i18n/locales/zh/settings/models.ts` | [AI模型配置](features/AI模型配置.md) | 中文文案 | 与英文词典同构 |
| `src/modules/source-control/useSourceControlPanel.ts` | [AI提交信息生成](features/AI提交信息生成.md) | 源代码管理 | 生成流程编排与 Conventional 校验/修复重试 |
| `src/modules/ai/config/prompts.ts` | [AI提交信息生成](features/AI提交信息生成.md) | [AI模型配置](features/AI模型配置.md) | 内置提示词全文与取值（会话 full/lite + 提交信息） |
| `src/settings/sections/AgentsSection.tsx` | [AI提交信息生成](features/AI提交信息生成.md) | [设置页](features/设置页.md) | AI 行为设置、提示词模块与各区域搜索锚点 |
| `src/modules/settings/openSettings.ts` | [设置页](features/设置页.md) | [AI面板](features/AI面板.md) | 设置 tab 打开注册表，深层组件经此调用 |
| `src/settings/sections/ShortcutsSection.tsx` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | [终端命令与结果块](features/终端命令与结果块.md)、快捷键自定义、[设置页](features/设置页.md) | 保存用户覆盖键位、警告 Ctrl+R 冲突并提供逐行搜索锚点 |
| `src/modules/command-palette/CommandPalette.tsx` | [命令面板](features/命令面板.md) | 主题切换 | 面板 UI、查询模式分流与主题预览 |
| `src/modules/command-palette/commands.ts` | [命令面板](features/命令面板.md) | 无 | 命令清单注册与禁用态 |
| `src/modules/command-palette/lib/mode.ts` | [命令面板](features/命令面板.md) | 无 | `#`/`?` 前缀查询分流 |
| `src/modules/command-palette/lib/fuzzy.ts` | [命令面板](features/命令面板.md) | 无 | 命令模糊匹配打分 |
| `src/modules/command-palette/lib/mru.ts` | [命令面板](features/命令面板.md) | 无 | 会话内最近使用排序 |
| `src/modules/command-palette/hooks/useContentSearch.ts` | [命令面板](features/命令面板.md) | 无 | `#` 内容搜索异步查询 |
| `src/settings/sections/AboutSection.tsx` | [设置-关于](features/设置-关于.md) | [设置页](features/设置页.md) | 关于分区 UI、仓库链接与更新/源码搜索锚点 |
| `src/modules/updater/useUpdater.ts` | [设置-关于](features/设置-关于.md) | 应用更新、[代理](features/代理.md) | 更新状态机与手动检查，检查/下载遵循更新场景代理 |
| `src/settings/sections/ProxySection.tsx` | [代理](features/代理.md) | [设置页](features/设置页.md) | 代理设置分区 UI 与搜索锚点 |
| `src/modules/proxy/components/ProxyStatusButton.tsx` | [代理](features/代理.md) | 状态栏 | 状态栏三场景代理开关与「刷新终端生效」提示 |
| `src/modules/proxy/components/TerminalProxyBadge.tsx` | [代理](features/代理.md) | 状态栏 | 左侧隐私徽章旁的绿色「代理：终端命令已生效」徽章 |
| `src/modules/proxy/lib/proxy.ts` | [代理](features/代理.md) | 无 | 代理 URL 解析与场景判定 |
| `src/modules/proxy/lib/terminalProxyRegistry.ts` | [代理](features/代理.md) | 无 | 终端会话创建时的代理快照登记表（leafId → URL），由 `useGhosttyTerminalSession` 读写 |
| `src/modules/proxy/lib/autoLaunch.ts` | [代理](features/代理.md) | [通知中心](features/通知中心.md) | 代理软件自动启动触发与失败通知 |
| `src-tauri/src/modules/proxy.rs` | [代理](features/代理.md) | 无 | 代理软件进程检测与启动 |
| `src-tauri/src/modules/net/clients.rs` | [代理](features/代理.md) | AI 会话 | reqwest 客户端缓存，代理地址纳入缓存键 |
