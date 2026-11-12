# 文件到功能反查表

> 只收录有业务含义的源文件。自动生成文件、测试、构建脚本和纯配置不在此列。
> 一个文件涉及多个功能时，第二列登记主归属，其余登记在第三列。
> 表格是唯一数据源；目录树由 project-atlas 的 render-file-map-tree.sh 生成，不要手改。
> 最后校验：2026-11-12

## 按目录浏览

<!-- file-tree:start -->
```text
src-tauri/
└── src/
    ├── lib.rs — [开发者工具] 提供 `open_devtools` 命令；单实例插件最先注册，二次启动文件参数走 macOS「打开方式」同款链路（次：设置窗口、原生 IPC、关闭窗口与系统托盘）
    └── modules/
        ├── file_manager.rs — [终端链接打开] 第三方文件管理器探测与打开命令
        ├── net/
        │   └── clients.rs — [代理] reqwest 客户端缓存，代理地址纳入缓存键（次：AI 会话）
        ├── proxy.rs — [代理] 代理软件进程检测与启动
        ├── pty/
        │   ├── scripts/
        │   │   ├── bashrc.bash — [终端命令与结果块] OSC 133 标记、PS0 预执行与块头间隔空行（次：bash 集成）
        │   │   ├── init.fish — [终端命令与结果块] OSC 133 标记、命令行上报与块头间隔空行（次：fish 集成）
        │   │   ├── profile.ps1 — [终端命令与结果块] OSC 133 标记、命令行上报与块头间隔空行（次：PowerShell 集成）
        │   │   └── zshrc.zsh — [终端命令与结果块] OSC 133 标记、命令行上报与块头间隔空行（次：zsh 集成）
        │   └── shell_init.rs — [终端命令与结果块] Windows/WSL Shell 启动与终端集成环境；`WSLENV` 合并转发（次：代理）
        ├── shell/
        │   └── mod.rs — [AI命令执行] Shell 元数据与真实 argv 共用 `OneShotShell`；提供 describe、前台 session 与后台进程 IPC（次：代理）
        ├── single_instance.rs — [关闭窗口与系统托盘] 单实例插件封装：二次启动转发 argv、唤回主窗口后新进程退出
        ├── traces.rs — [设置-关于] `app_traces`：安装、配置、数据、缓存、日志、注册表与凭据痕迹
        └── tray.rs — [关闭窗口与系统托盘] 托盘图标、左键恢复窗口、右键菜单（打开/关闭程序）；`reveal_main_window` 供托盘、二次启动与 Dock 共用

src/
├── app/
│   ├── App.tsx — [开发者工具] 注册 DevTools 与关闭守卫接线，协调标签页、预览、搜索目标与左右对称布局；组合 AI/终端文件投放目标并触发启动更新检查；提供左右边框拖拽阀控制器（次：撤销终端窗格拆分、终端链接打开、终端命令与结果块、标签内搜索、关闭窗口与系统托盘、无边框窗口与边框交互、AI面板、应用更新）
│   ├── components/
│   │   ├── CloseDialogs.tsx — [关闭窗口与系统托盘] 退出/缩小到托盘选择窗口与「记住我的选择」（次：标签关闭确认）
│   │   ├── WindowEdgeValves.tsx — [无边框窗口与边框交互] 左右边框拖拽阀：阀段开关/拖动侧栏与 AI 面板，其余边框区域交系统原生 resize（次：AI面板、文件资源管理器）
│   │   └── WorkspaceSurface.tsx — [终端链接打开] 透传预览与块搜索回调，并在工作区层渲染设置页（次：工作区渲染、设置页、终端命令与结果块）
│   ├── hooks/
│   │   └── useAppCloseGuard.ts — [关闭窗口与系统托盘] 关闭请求总入口：读取 `closeAction`、选择窗口、托盘隐藏与退出前守卫（次：会话落盘守卫）
│   └── lib/
│       └── appTray.ts — [关闭窗口与系统托盘] 调用 `tray_show` 后隐藏窗口，托盘不可用时回落退出（次：系统托盘）
├── components/
│   ├── WindowControls.tsx — [关闭窗口与系统托盘] 最小化/最大化/关闭按钮；点击区通栏标题栏；关闭仍只调用 `window.close()`（次：无边框窗口与边框交互）
│   └── ui/
│       └── resizable.tsx — [AI面板] 分隔线、拖拽热区与常驻六点握把；握把静止/悬停/拖拽三级对比色（次：可调整布局）
├── lib/
│   ├── external-link.ts — [终端链接打开] Ctrl 或 Cmd 分支调用系统浏览器（次：外部链接）
│   ├── maximizedChrome.ts — [无边框窗口与边框交互] 窗口最大化状态订阅：`<html data-maximized>` 镜像与 `useWindowMaximized` hook
│   ├── open-path.ts — [终端链接打开] 路径识别与文件管理器打开（次：终端路径历史）
│   └── useCaptureOutsideDismiss.ts — [标签页管理] 受控浮层的 document 捕获阶段外部指针关闭与监听清理（次：状态栏工作区与路径）
├── main.tsx — [无边框窗口与边框交互] 应用引导：`data-chrome="borderless"` 标记、最大化状态镜像、窗口延迟显示
├── modules/
│   ├── agents/
│   │   ├── components/
│   │   │   └── NotificationBell.tsx — [通知中心] 未读角标、通知历史、右侧详情与复制、Agent 跳转与运行时动作（次：外部编码代理管理）
│   │   ├── lib/
│   │   │   ├── route.ts — [通知中心] Agent 通知送达、正文入队和应用内显示方式（次：外部编码代理管理）
│   │   │   ├── runtimeNotifications.ts — [通知中心] 软件消息统一入口与 Sonner/历史生命周期协调
│   │   │   └── types.ts — [通知中心] Agent/运行时通知联合类型（次：外部编码代理管理）
│   │   └── store/
│   │       └── agentStore.ts — [通知中心] 活跃 Agent、50 条通知历史、已读与稳定 ID 更新（次：外部编码代理管理）
│   ├── ai/
│   │   ├── components/
│   │   │   ├── AgentRunBridge.tsx — [AI面板] 主窗口唯一聊天引擎、agentMeta 与持久化、AI diff tab 管理（次：AI 对话与工具审批）
│   │   │   ├── AiChat.tsx — [AI面板] 消息渲染、请求失败展示、重试与关闭操作（次：AI 对话）
│   │   │   ├── AiOpenButton.tsx — [快捷键提示] 状态栏 AI 开关与动态快捷键提示（次：AI面板）
│   │   │   ├── AiPanel.tsx — [AI面板] 右侧面板页面：聊天、会话、计划横幅与空态；接入失败回合重试；根节点标记文件投放区域并渲染投放高亮（次：AI 对话）
│   │   │   ├── AiPanelComposer.tsx — [AI面板] 完整 Composer 与 prefill；元信息行组装；附件 chip 与「N 个附件」标题（次：AI 对话）
│   │   │   ├── AiPanelSkeleton.tsx — [AI面板] 懒加载分包就绪前的同构骨架占位（次：AI 对话）
│   │   │   ├── ApprovalModeToggle.tsx — [AI面板] 执行审批模式切换（review/auto）（次：AI 对话与工具审批）
│   │   │   └── ModelPicker.tsx — [AI模型配置] 思考强度滑条与模型选择（次：AI 面板）
│   │   ├── config/
│   │   │   ├── defaults.ts — [AI模型配置] 内置厂商目录与思考强度档位
│   │   │   ├── normalize.ts — [AI模型配置] 配置收敛与旧 thinking/ParamDef 迁移
│   │   │   ├── params.ts — [AI模型配置] 请求参数引擎：params、effort 档位、extra 合并（次：AI 对话与工具审批）
│   │   │   ├── persist.ts — [AI模型配置] terax-ai-models.json 读写
│   │   │   ├── prompts.ts — [AI提交信息生成] 内置提示词全文与取值（会话 full/lite + 提交信息）（次：AI模型配置）
│   │   │   └── types.ts — [AI模型配置] `ParamDef` / `EffortConfig` 等数据模型
│   │   ├── lib/
│   │   │   ├── agent.ts — [AI模型配置] withRequestParams 把解析后的参数合并进出站请求；把本轮 Shell 描述传给工具构建器（次：AI 对话与工具审批、AI命令执行）
│   │   │   ├── aiAttachmentDrop.ts — [AI面板] AI 面板投放目标：命中 `data-ai-attach-drop`、drop 时写 prefill（次：文件资源管理器）
│   │   │   ├── aiPanel.ts — [AI面板] 面板开关封装与 Provider 检查（次：选区与文件 prefill）
│   │   │   ├── aiPanelBridge.ts — [AI面板] prefill 类型契约
│   │   │   ├── approvalMode.ts — [AI面板] 工具 needsApproval 按偏好动态判定（次：AI 对话与工具审批）
│   │   │   ├── composer.tsx — [AI面板] 附件读取、按 id 去重、批量路径附加与跳过/失败提示；`terax:ai-attach-file` 监听（次：AI 对话）
│   │   │   ├── composerMessage.ts — [AI面板] Composer 到 AI SDK parts 的纯转换（次：AI 对话）
│   │   │   ├── native.ts — [AI命令执行] `ShellDescription` 契约、`shell_describe` 封装及 Shell 调用的工作区快照参数（次：原生 IPC）
│   │   │   └── transport.ts — [AI命令执行] 每轮查询真实 Shell，注入 `<env>` 并把描述传给 Agent（次：AI 对话与工具审批）
│   │   ├── store/
│   │   │   ├── aiAttachmentDropStore.ts — [AI面板] 拖动进入面板时的高亮状态
│   │   │   └── aiPanelStore.ts — [AI面板] 面板开关与 prefill 状态
│   │   └── tools/
│   │       ├── shell.ts — [AI命令执行] 前台/后台工具的动态方言描述、工作区快照、失败提示及会话/进程调用（次：AI 对话与工具审批、代理）
│   │       └── tools.ts — [AI命令执行] 汇总 AI 工具并将 Shell 描述传给 Shell 工具构建器（次：AI 对话与工具审批）
│   ├── command-palette/
│   │   ├── CommandPalette.tsx — [命令面板] 面板 UI、查询模式分流与主题预览（次：主题切换）
│   │   ├── commands.ts — [命令面板] 命令清单注册与禁用态
│   │   ├── hooks/
│   │   │   └── useContentSearch.ts — [命令面板] `#` 内容搜索异步查询
│   │   └── lib/
│   │       ├── fuzzy.ts — [命令面板] 命令模糊匹配打分
│   │       ├── mode.ts — [命令面板] `>` 前缀路径模式解析与 `#`/`?` 查询分流（次：终端路径历史）
│   │       └── mru.ts — [命令面板] 会话内最近使用排序
│   ├── explorer/
│   │   ├── ExplorerSearch.tsx — [文件资源管理器] 模糊查询、搜索树渲染、键盘导航与目录折叠
│   │   ├── FileExplorer.tsx — [文件资源管理器] 普通树与搜索视图容器、文件搜索按钮动态标题；接收组合后的路径投放目标（次：快捷键提示、AI面板）
│   │   └── lib/
│   │       ├── searchTree.ts — [文件资源管理器] 命中到裁剪目录树的纯转换、祖先去重与可见行计算
│   │       └── useExplorerDnd.ts — [文件资源管理器] 指针拖拽、拖动浮层与多目标链（`combinePathDropTargets`）（次：AI面板、终端路径投放）
│   ├── header/
│   │   ├── Header.tsx — [快捷键提示] 设置、侧栏、命令面板按钮提示与通知铃铛入口（次：顶栏布局、通知中心）
│   │   └── SearchInline.tsx — [快捷键提示] Ctrl+F 与命令块查找共用的弹窗，按 target 切换全文或局部控制器；无 target 时不渲染（次：标签内搜索、终端命令与结果块）
│   ├── i18n/
│   │   └── locales/
│   │       ├── en/
│   │       │   ├── agents.ts — [通知中心] 通知详情复制反馈等英文文案（次：外部编码代理管理）
│   │       │   ├── preview.ts — [预览端口管理] 端口菜单与表单文案（次：英文文案）
│   │       │   ├── settings/
│   │       │   │   ├── models.ts — [AI模型配置] Params/Effort 字段与规则文案（次：英文文案）
│   │       │   │   └── search.ts — [设置页] 设置搜索 placeholder、无障碍名称与空结果（次：英文文案）
│   │       │   └── shortcuts.ts — [快捷键提示] 快捷键名称（次：英文文案）
│   │       └── zh/
│   │           ├── agents.ts — [通知中心] 通知详情复制反馈等中文文案（次：外部编码代理管理）
│   │           ├── preview.ts — [预览端口管理] 与英文词典同构（次：中文文案）
│   │           ├── settings/
│   │           │   ├── models.ts — [AI模型配置] 与英文词典同构（次：中文文案）
│   │           │   └── search.ts — [设置页] 与英文同构的设置搜索文案（次：中文文案）
│   │           └── shortcuts.ts — [快捷键提示] 与英文词典同构（次：中文文案）
│   ├── preview/
│   │   ├── PortPresetDialog.tsx — [预览端口管理] 新增与编辑端口表单（次：网页预览）
│   │   ├── PreviewAddressBar.tsx — [预览端口管理] 端口菜单、添加与编辑入口（次：网页预览）
│   │   ├── PreviewPane.tsx — [预览端口管理] 空态「端口」按钮调用地址栏 handle（次：网页预览）
│   │   └── lib/
│   │       └── portPresets.ts — [预览端口管理] 默认端口、归一化、合并与重复校验
│   ├── proxy/
│   │   ├── components/
│   │   │   ├── ProxyStatusButton.tsx — [代理] 状态栏三场景代理开关与「刷新终端生效」提示（次：状态栏）
│   │   │   └── TerminalProxyBadge.tsx — [代理] 左侧隐私徽章旁的绿色「代理：终端命令已生效」徽章（次：状态栏）
│   │   └── lib/
│   │       ├── autoLaunch.ts — [代理] 代理软件自动启动触发与失败通知（次：通知中心）
│   │       ├── proxy.ts — [代理] 代理 URL 解析与场景判定
│   │       └── terminalProxyRegistry.ts — [代理] 终端会话创建时的代理快照登记表（leafId → URL），由 `useGhosttyTerminalSession` 读写
│   ├── settings/
│   │   ├── openSettings.ts — [设置页] 设置 tab 打开注册表，深层组件经此调用（次：AI面板）
│   │   └── store.ts — [预览端口管理] 端口列表、通知显示方式、`closeAction`、`autoCheckUpdates` 持久化与跨窗口广播（次：设置窗口与偏好同步、通知中心、关闭窗口与系统托盘、应用更新）
│   ├── shortcuts/
│   │   ├── components/
│   │   │   └── ShortcutTooltip.tsx — [快捷键提示] 统一 Tooltip 与菜单快捷键文本
│   │   ├── index.ts — [快捷键提示] 快捷键模块公共导出
│   │   ├── lib/
│   │   │   ├── useGlobalShortcuts.ts — [快捷键提示] 捕获键盘事件、派发处理器并跳过 Ctrl+R（次：终端命令与结果块）
│   │   │   └── useShortcutTokens.ts — [快捷键提示] 响应式读取用户覆盖并生成紧凑文本（次：全局快捷键分发）
│   │   └── shortcuts.ts — [快捷键提示] 快捷键 ID、默认绑定、显示令牌、Ctrl+R 保留判定与设置搜索快捷键索引来源（次：撤销终端窗格拆分、开发者工具、终端命令与结果块、设置页）
│   ├── source-control/
│   │   └── useSourceControlPanel.ts — [AI提交信息生成] 生成流程编排与 Conventional 校验/修复重试（次：源代码管理）
│   ├── statusbar/
│   │   ├── CwdBreadcrumb.tsx — [状态栏工作区与路径] 路径面包屑、子目录导航与折叠路径受控菜单（次：终端路径历史）
│   │   ├── StatusBar.tsx — [状态栏工作区与路径] 组装工作区环境、路径导航和状态操作入口（次：代理、AI面板）
│   │   └── WorkspaceEnvSelector.tsx — [状态栏工作区与路径] Windows/WSL 工作区选择、发行版懒加载与受控菜单
│   ├── tabs/
│   │   ├── NewTabMenu.tsx — [标签页管理] 新建标签类型与编码代理启动入口，菜单显示快捷键（次：快捷键提示）
│   │   ├── TabBar.tsx — [标签页管理] 标签栏、受控右键菜单与捕获阶段外部点击关闭（次：快捷键提示）
│   │   └── lib/
│   │       └── useTabs.ts — [撤销终端窗格拆分] 记录拆分历史、恢复焦点、维护终端标签与 settings tab 单例（次：终端命令与结果块、标签与分屏状态、AI面板）
│   ├── terminal/
│   │   ├── PaneTreeView.tsx — [终端链接打开] 分屏叶节点与块搜索回调透传（次：终端分屏、终端命令与结果块）
│   │   ├── TerminalPane.tsx — [终端命令与结果块] 选区优先、块右键命中，创建局部搜索控制器并打开共享弹窗（次：终端链接打开、终端会话与渲染）
│   │   ├── TerminalStack.tsx — [终端链接打开] 标签级回调与块搜索回调最新引用（次：标签页管理、终端命令与结果块）
│   │   ├── block/
│   │   │   ├── BlockContextMenu.tsx — [终端命令与结果块] 六项块操作右键菜单（次：AI prefill 与剪贴板）
│   │   │   ├── BlockOverlay.tsx — [终端命令与结果块] 块尾分隔线、失败退出码、命令时间线；块清空时关闭共享搜索（次：终端块展示）
│   │   │   └── CommandTimeline.tsx — [终端命令与结果块] 右缘命令时间线：聚拢等距排布、悬停波浪与 Tooltip、点击定位（次：终端块展示）
│   │   ├── ghostty/
│   │   │   ├── GhosttyBlockOverlay.tsx — [终端命令与结果块] 连接块控制器与覆盖层，清块时关闭共享搜索（次：会话桥接）
│   │   │   ├── GhosttyBlocks.ts — [终端命令与结果块] OSC 133 块边界、读取、局部文本/正则搜索、右键命中与时间线/定位（次：Ghostty model 适配）
│   │   │   ├── core/
│   │   │   │   └── terminalLinks.ts — [终端链接打开] URL 与绝对路径文本检测（次：终端路径历史）
│   │   │   ├── gpu/
│   │   │   │   └── WebGpuTerminalSurface.ts — [终端链接打开] WebGPU 链接点击、修饰键透传与输入法锚点同步（次：终端输入法候选框定位、终端渲染）
│   │   │   ├── search/
│   │   │   │   └── GhosttyBlockSearchController.ts — [终端命令与结果块] 把异步块扫描、取消和匹配导航适配为 TerminalSearchController（次：标签内搜索）
│   │   │   ├── useGhosttyTerminalSession.ts — [终端链接打开] 分流链接并为所有终端初始化块会话（次：终端命令与结果块、终端会话与渲染）
│   │   │   └── webgl/
│   │   │       └── WebGlTerminalSurface.ts — [终端链接打开] WebGL 链接点击、修饰键透传与输入法锚点同步（次：终端输入法候选框定位、终端渲染回退）
│   │   ├── lib/
│   │   │   ├── blockAnchorProbe.ts — [终端命令与结果块] 检测会话缺失 OSC 133;C 命令锚点（PS 5.1 无 PSReadLine 时提示安装）（次：终端会话与渲染）
│   │   │   ├── panes.ts — [撤销终端窗格拆分] 叶节点查询、拆分与移除（次：终端链接打开）
│   │   │   ├── pathHistory.ts — [终端路径历史] 目录历史记录/封顶/筛选规则与跨工作区路径归一化
│   │   │   ├── terminalCd.ts — [终端路径历史] cd 命令构造与提交（次：终端链接打开）
│   │   │   ├── terminalLinks.ts — [终端链接打开] 定义链接修饰键与打开契约（次：终端输入）
│   │   │   ├── terminalSessionApi.ts — [撤销终端窗格拆分] 释放被撤销窗格资源；`restartSession`/`restartAllSessions` 刷新终端让新设置生效（次：终端会话生命周期、代理）
│   │   │   └── useVisiblePathHistory.ts — [终端路径历史] 组合工作区环境与 automount root，产出当前视图可见历史（次：状态栏工作区与路径）
│   │   └── path-history/
│   │       └── PathHistoryDialog.tsx — [终端路径历史] Ctrl+E 最近路径弹窗
│   └── updater/
│       └── useUpdater.ts — [应用更新] 全局更新状态机、启动自动检查、通知消息与下载安装；检查/下载遵循更新场景代理（次：设置-关于、代理）
└── settings/
    ├── SettingsView.tsx — [设置页] 左侧搜索框与竖向分区导航、右侧内容区、结果定位与高亮（次：偏好同步）
    ├── components/
    │   ├── LspServersGroup.tsx — [设置页] 语言服务器区域入口与搜索锚点（次：LSP 语言服务）
    │   ├── SettingRow.tsx — [设置页] 普通设置行布局与可选搜索锚点
    │   └── SettingsSearch.tsx — [设置页] 跨分区查询、翻译后过滤、按分区分组、结果浮层排版与键盘交互；注册 Ctrl+F 聚焦（次：标签内搜索）
    ├── sections/
    │   ├── AboutSection.tsx — [设置-关于] 关于分区 UI、仓库链接、更新/源码搜索锚点与文件/注册表痕迹清单；复用全局更新状态并一键安装（次：设置页、应用更新）
    │   ├── AgentsSection.tsx — [AI提交信息生成] AI 行为设置、提示词模块与各区域搜索锚点（次：设置页）
    │   ├── EditorSection.tsx — [设置页] 编辑器设置 UI、条件选项与搜索锚点（次：编辑器偏好）
    │   ├── GeneralSection.tsx — [设置页] 通用设置 UI 与搜索锚点；关闭窗口行为与启动自动检查更新开关（次：通用偏好、关闭窗口与系统托盘、应用更新）
    │   ├── ModelsSection.tsx — [AI模型配置] 模型/Provider 编辑器、校验与配置/默认项/Provider 搜索锚点（次：设置页）
    │   ├── ProxySection.tsx — [代理] 代理设置分区 UI 与搜索锚点（次：设置页）
    │   ├── ShortcutsSection.tsx — [撤销终端窗格拆分] 保存用户覆盖键位、警告 Ctrl+R 冲突并提供逐行搜索锚点（次：终端命令与结果块、快捷键自定义、设置页）
    │   ├── ThemesSection.tsx — [设置页] 主题、编辑器主题和背景设置锚点（次：主题与窗口外观）
    │   └── models/
    │       └── StructuredFields.tsx — [AI模型配置] ParamsForm / EffortForm 等结构化表单（次：设置页）
    ├── settingsSearch.ts — [设置页] 设置搜索静态索引、目标 ID、关键词与条件可见性
    └── settingsSearchFocus.ts — [标签内搜索] 主窗口 Ctrl+F 聚焦设置搜索框的最小注册表（次：设置页）
```
<!-- file-tree:end -->

## 文件 → 功能 反查表（唯一数据源）

| 文件 | 主归属功能 | 次要归属 | 说明 |
|---|---|---|---|
| `src/app/App.tsx` | [开发者工具](features/开发者工具.md) | [撤销终端窗格拆分](features/撤销终端窗格拆分.md)、[终端链接打开](features/终端链接打开.md)、[终端命令与结果块](features/终端命令与结果块.md)、[标签内搜索](features/标签内搜索.md)、[关闭窗口与系统托盘](features/关闭窗口与系统托盘.md)、[无边框窗口与边框交互](features/无边框窗口与边框交互.md)、[AI面板](features/AI面板.md)、[应用更新](features/应用更新.md) | 注册 DevTools 与关闭守卫接线，协调标签页、预览、搜索目标与左右对称布局；组合 AI/终端文件投放目标并触发启动更新检查；提供左右边框拖拽阀控制器 |
| `src/components/ui/resizable.tsx` | [AI面板](features/AI面板.md) | 可调整布局 | 分隔线、拖拽热区与常驻六点握把；握把静止/悬停/拖拽三级对比色 |
| `src/app/components/WorkspaceSurface.tsx` | [终端链接打开](features/终端链接打开.md) | 工作区渲染、[设置页](features/设置页.md)、[终端命令与结果块](features/终端命令与结果块.md) | 透传预览与块搜索回调，并在工作区层渲染设置页 |
| `src/app/hooks/useAppCloseGuard.ts` | [关闭窗口与系统托盘](features/关闭窗口与系统托盘.md) | 会话落盘守卫 | 关闭请求总入口：读取 `closeAction`、选择窗口、托盘隐藏与退出前守卫 |
| `src/app/lib/appTray.ts` | [关闭窗口与系统托盘](features/关闭窗口与系统托盘.md) | 系统托盘 | 调用 `tray_show` 后隐藏窗口，托盘不可用时回落退出 |
| `src/app/components/CloseDialogs.tsx` | [关闭窗口与系统托盘](features/关闭窗口与系统托盘.md) | 标签关闭确认 | 退出/缩小到托盘选择窗口与「记住我的选择」 |
| `src/components/WindowControls.tsx` | [关闭窗口与系统托盘](features/关闭窗口与系统托盘.md) | [无边框窗口与边框交互](features/无边框窗口与边框交互.md) | 最小化/最大化/关闭按钮；点击区通栏标题栏；关闭仍只调用 `window.close()` |
| `src/lib/maximizedChrome.ts` | [无边框窗口与边框交互](features/无边框窗口与边框交互.md) | 无 | 窗口最大化状态订阅：`<html data-maximized>` 镜像与 `useWindowMaximized` hook |
| `src/lib/useCaptureOutsideDismiss.ts` | [标签页管理](features/标签页管理.md) | [状态栏工作区与路径](features/状态栏工作区与路径.md) | 受控浮层的 document 捕获阶段外部指针关闭与监听清理 |
| `src/app/components/WindowEdgeValves.tsx` | [无边框窗口与边框交互](features/无边框窗口与边框交互.md) | [AI面板](features/AI面板.md)、[文件资源管理器](features/文件资源管理器.md) | 左右边框拖拽阀：阀段开关/拖动侧栏与 AI 面板，其余边框区域交系统原生 resize |
| `src/main.tsx` | [无边框窗口与边框交互](features/无边框窗口与边框交互.md) | 无 | 应用引导：`data-chrome="borderless"` 标记、最大化状态镜像、窗口延迟显示 |
| `src-tauri/src/modules/tray.rs` | [关闭窗口与系统托盘](features/关闭窗口与系统托盘.md) | 无 | 托盘图标、左键恢复窗口、右键菜单（打开/关闭程序）；`reveal_main_window` 供托盘、二次启动与 Dock 共用 |
| `src-tauri/src/modules/single_instance.rs` | [关闭窗口与系统托盘](features/关闭窗口与系统托盘.md) | 无 | 单实例插件封装：二次启动转发 argv、唤回主窗口后新进程退出 |
| `src-tauri/src/lib.rs` | [开发者工具](features/开发者工具.md) | 设置窗口、原生 IPC、关闭窗口与系统托盘 | 提供 `open_devtools` 命令；单实例插件最先注册，二次启动文件参数走 macOS「打开方式」同款链路 |
| `src/modules/shortcuts/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | [撤销终端窗格拆分](features/撤销终端窗格拆分.md)、[开发者工具](features/开发者工具.md)、[终端命令与结果块](features/终端命令与结果块.md)、[设置页](features/设置页.md) | 快捷键 ID、默认绑定、显示令牌、Ctrl+R 保留判定与设置搜索快捷键索引来源 |
| `src/modules/shortcuts/lib/useGlobalShortcuts.ts` | [快捷键提示](features/快捷键提示.md) | [终端命令与结果块](features/终端命令与结果块.md) | 捕获键盘事件、派发处理器并跳过 Ctrl+R |
| `src/modules/shortcuts/lib/useShortcutTokens.ts` | [快捷键提示](features/快捷键提示.md) | 全局快捷键分发 | 响应式读取用户覆盖并生成紧凑文本 |
| `src/modules/shortcuts/components/ShortcutTooltip.tsx` | [快捷键提示](features/快捷键提示.md) | 无 | 统一 Tooltip 与菜单快捷键文本 |
| `src/modules/shortcuts/index.ts` | [快捷键提示](features/快捷键提示.md) | 无 | 快捷键模块公共导出 |
| `src/modules/header/Header.tsx` | [快捷键提示](features/快捷键提示.md) | 顶栏布局、[通知中心](features/通知中心.md) | 设置、侧栏、命令面板按钮提示与通知铃铛入口 |
| `src/modules/agents/components/NotificationBell.tsx` | [通知中心](features/通知中心.md) | 外部编码代理管理 | 未读角标、通知历史、右侧详情与复制、Agent 跳转与运行时动作 |
| `src/modules/i18n/locales/zh/agents.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | 通知详情复制反馈等中文文案 |
| `src/modules/i18n/locales/en/agents.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | 通知详情复制反馈等英文文案 |
| `src/modules/agents/lib/runtimeNotifications.ts` | [通知中心](features/通知中心.md) | 无 | 软件消息统一入口与 Sonner/历史生命周期协调 |
| `src/modules/agents/lib/types.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | Agent/运行时通知联合类型 |
| `src/modules/agents/store/agentStore.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | 活跃 Agent、50 条通知历史、已读与稳定 ID 更新 |
| `src/modules/agents/lib/route.ts` | [通知中心](features/通知中心.md) | 外部编码代理管理 | Agent 通知送达、正文入队和应用内显示方式 |
| `src/modules/header/SearchInline.tsx` | [快捷键提示](features/快捷键提示.md) | [标签内搜索](features/标签内搜索.md)、[终端命令与结果块](features/终端命令与结果块.md) | Ctrl+F 与命令块查找共用的弹窗，按 target 切换全文或局部控制器；无 target 时不渲染 |
| `src/modules/statusbar/StatusBar.tsx` | [状态栏工作区与路径](features/状态栏工作区与路径.md) | [代理](features/代理.md)、[AI面板](features/AI面板.md) | 组装工作区环境、路径导航和状态操作入口 |
| `src/modules/statusbar/WorkspaceEnvSelector.tsx` | [状态栏工作区与路径](features/状态栏工作区与路径.md) | 无 | Windows/WSL 工作区选择、发行版懒加载与受控菜单 |
| `src/modules/statusbar/CwdBreadcrumb.tsx` | [状态栏工作区与路径](features/状态栏工作区与路径.md) | [终端路径历史](features/终端路径历史.md) | 路径面包屑、子目录导航与折叠路径受控菜单 |
| `src/modules/tabs/NewTabMenu.tsx` | [标签页管理](features/标签页管理.md) | [快捷键提示](features/快捷键提示.md) | 新建标签类型与编码代理启动入口，菜单显示快捷键 |
| `src/modules/tabs/TabBar.tsx` | [标签页管理](features/标签页管理.md) | [快捷键提示](features/快捷键提示.md) | 标签栏、受控右键菜单与捕获阶段外部点击关闭 |
| `src/modules/ai/components/AiOpenButton.tsx` | [快捷键提示](features/快捷键提示.md) | [AI面板](features/AI面板.md) | 状态栏 AI 开关与动态快捷键提示 |
| `src/modules/ai/components/AiPanel.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 右侧面板页面：聊天、会话、计划横幅与空态；接入失败回合重试；根节点标记文件投放区域并渲染投放高亮 |
| `src/modules/ai/components/AiPanelSkeleton.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 懒加载分包就绪前的同构骨架占位 |
| `src/modules/ai/components/AiChat.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 消息渲染、请求失败展示、重试与关闭操作 |
| `src/modules/ai/components/AiPanelComposer.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 完整 Composer 与 prefill；元信息行组装；附件 chip 与「N 个附件」标题 |
| `src/modules/ai/lib/composer.tsx` | [AI面板](features/AI面板.md) | AI 对话 | 附件读取、按 id 去重、批量路径附加与跳过/失败提示；`terax:ai-attach-file` 监听 |
| `src/modules/ai/lib/aiAttachmentDrop.ts` | [AI面板](features/AI面板.md) | [文件资源管理器](features/文件资源管理器.md) | AI 面板投放目标：命中 `data-ai-attach-drop`、drop 时写 prefill |
| `src/modules/ai/store/aiAttachmentDropStore.ts` | [AI面板](features/AI面板.md) | 无 | 拖动进入面板时的高亮状态 |
| `src/modules/ai/components/ApprovalModeToggle.tsx` | [AI面板](features/AI面板.md) | AI 对话与工具审批 | 执行审批模式切换（review/auto） |
| `src/modules/ai/lib/approvalMode.ts` | [AI面板](features/AI面板.md) | AI 对话与工具审批 | 工具 needsApproval 按偏好动态判定 |
| `src/modules/ai/components/AgentRunBridge.tsx` | [AI面板](features/AI面板.md) | AI 对话与工具审批 | 主窗口唯一聊天引擎、agentMeta 与持久化、AI diff tab 管理 |
| `src/modules/ai/lib/aiPanel.ts` | [AI面板](features/AI面板.md) | 选区与文件 prefill | 面板开关封装与 Provider 检查 |
| `src/modules/ai/store/aiPanelStore.ts` | [AI面板](features/AI面板.md) | 无 | 面板开关与 prefill 状态 |
| `src/modules/ai/lib/aiPanelBridge.ts` | [AI面板](features/AI面板.md) | 无 | prefill 类型契约 |
| `src/modules/ai/lib/composerMessage.ts` | [AI面板](features/AI面板.md) | AI 对话 | Composer 到 AI SDK parts 的纯转换 |
| `src/modules/explorer/FileExplorer.tsx` | [文件资源管理器](features/文件资源管理器.md) | [快捷键提示](features/快捷键提示.md)、[AI面板](features/AI面板.md) | 普通树与搜索视图容器、文件搜索按钮动态标题；接收组合后的路径投放目标 |
| `src/modules/explorer/lib/useExplorerDnd.ts` | [文件资源管理器](features/文件资源管理器.md) | [AI面板](features/AI面板.md)、终端路径投放 | 指针拖拽、拖动浮层与多目标链（`combinePathDropTargets`） |
| `src/modules/explorer/ExplorerSearch.tsx` | [文件资源管理器](features/文件资源管理器.md) | 无 | 模糊查询、搜索树渲染、键盘导航与目录折叠 |
| `src/modules/explorer/lib/searchTree.ts` | [文件资源管理器](features/文件资源管理器.md) | 无 | 命中到裁剪目录树的纯转换、祖先去重与可见行计算 |
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
| `src/modules/terminal/block/BlockOverlay.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | 终端块展示 | 块尾分隔线、失败退出码、命令时间线；块清空时关闭共享搜索 |
| `src/modules/terminal/block/CommandTimeline.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | 终端块展示 | 右缘命令时间线：聚拢等距排布、悬停波浪与 Tooltip、点击定位 |
| `src/modules/terminal/ghostty/GhosttyBlocks.ts` | [终端命令与结果块](features/终端命令与结果块.md) | Ghostty model 适配 | OSC 133 块边界、读取、局部文本/正则搜索、右键命中与时间线/定位 |
| `src/modules/terminal/ghostty/search/GhosttyBlockSearchController.ts` | [终端命令与结果块](features/终端命令与结果块.md) | 标签内搜索 | 把异步块扫描、取消和匹配导航适配为 TerminalSearchController |
| `src/modules/terminal/ghostty/GhosttyBlockOverlay.tsx` | [终端命令与结果块](features/终端命令与结果块.md) | 会话桥接 | 连接块控制器与覆盖层，清块时关闭共享搜索 |
| `src-tauri/src/modules/pty/shell_init.rs` | [终端命令与结果块](features/终端命令与结果块.md) | [代理](features/代理.md) | Windows/WSL Shell 启动与终端集成环境；`WSLENV` 合并转发 |
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
| `src/modules/settings/store.ts` | [预览端口管理](features/预览端口管理.md) | 设置窗口与偏好同步、[通知中心](features/通知中心.md)、[关闭窗口与系统托盘](features/关闭窗口与系统托盘.md)、[应用更新](features/应用更新.md) | 端口列表、通知显示方式、`closeAction`、`autoCheckUpdates` 持久化与跨窗口广播 |
| `src/modules/i18n/locales/en/preview.ts` | [预览端口管理](features/预览端口管理.md) | 英文文案 | 端口菜单与表单文案 |
| `src/modules/i18n/locales/zh/preview.ts` | [预览端口管理](features/预览端口管理.md) | 中文文案 | 与英文词典同构 |
| `src/modules/i18n/locales/en/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 英文文案 | 快捷键名称 |
| `src/modules/i18n/locales/zh/shortcuts.ts` | [快捷键提示](features/快捷键提示.md) | 中文文案 | 与英文词典同构 |
| `src/settings/SettingsView.tsx` | [设置页](features/设置页.md) | 偏好同步 | 左侧搜索框与竖向分区导航、右侧内容区、结果定位与高亮 |
| `src/settings/components/SettingsSearch.tsx` | [设置页](features/设置页.md) | [标签内搜索](features/标签内搜索.md) | 跨分区查询、翻译后过滤、按分区分组、结果浮层排版与键盘交互；注册 Ctrl+F 聚焦 |
| `src/settings/settingsSearch.ts` | [设置页](features/设置页.md) | 无 | 设置搜索静态索引、目标 ID、关键词与条件可见性 |
| `src/settings/settingsSearchFocus.ts` | [标签内搜索](features/标签内搜索.md) | [设置页](features/设置页.md) | 主窗口 Ctrl+F 聚焦设置搜索框的最小注册表 |
| `src/settings/components/SettingRow.tsx` | [设置页](features/设置页.md) | 无 | 普通设置行布局与可选搜索锚点 |
| `src/settings/sections/GeneralSection.tsx` | [设置页](features/设置页.md) | 通用偏好、[关闭窗口与系统托盘](features/关闭窗口与系统托盘.md)、[应用更新](features/应用更新.md) | 通用设置 UI 与搜索锚点；关闭窗口行为与启动自动检查更新开关 |
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
| `src/modules/ai/lib/agent.ts` | [AI模型配置](features/AI模型配置.md) | AI 对话与工具审批、[AI命令执行](features/AI命令执行.md) | withRequestParams 把解析后的参数合并进出站请求；把本轮 Shell 描述传给工具构建器 |
| `src/modules/ai/lib/native.ts` | [AI命令执行](features/AI命令执行.md) | 原生 IPC | `ShellDescription` 契约、`shell_describe` 封装及 Shell 调用的工作区快照参数 |
| `src/modules/ai/lib/transport.ts` | [AI命令执行](features/AI命令执行.md) | AI 对话与工具审批 | 每轮查询真实 Shell，注入 `<env>` 并把描述传给 Agent |
| `src/modules/ai/tools/tools.ts` | [AI命令执行](features/AI命令执行.md) | AI 对话与工具审批 | 汇总 AI 工具并将 Shell 描述传给 Shell 工具构建器 |
| `src/modules/ai/tools/shell.ts` | [AI命令执行](features/AI命令执行.md) | AI 对话与工具审批、[代理](features/代理.md) | 前台/后台工具的动态方言描述、工作区快照、失败提示及会话/进程调用 |
| `src-tauri/src/modules/shell/mod.rs` | [AI命令执行](features/AI命令执行.md) | [代理](features/代理.md) | Shell 元数据与真实 argv 共用 `OneShotShell`；提供 describe、前台 session 与后台进程 IPC |
| `src/settings/sections/ModelsSection.tsx` | [AI模型配置](features/AI模型配置.md) | [设置页](features/设置页.md) | 模型/Provider 编辑器、校验与配置/默认项/Provider 搜索锚点 |
| `src/settings/sections/models/StructuredFields.tsx` | [AI模型配置](features/AI模型配置.md) | [设置页](features/设置页.md) | ParamsForm / EffortForm 等结构化表单 |
| `src/modules/ai/components/ModelPicker.tsx` | [AI模型配置](features/AI模型配置.md) | AI 面板 | 思考强度滑条与模型选择 |
| `src/modules/i18n/locales/en/settings/models.ts` | [AI模型配置](features/AI模型配置.md) | 英文文案 | Params/Effort 字段与规则文案 |
| `src/modules/terminal/ghostty/core/terminalLinks.ts` | [终端链接打开](features/终端链接打开.md) | 终端路径历史 | URL 与绝对路径文本检测 |
| `src/lib/open-path.ts` | [终端链接打开](features/终端链接打开.md) | 终端路径历史 | 路径识别与文件管理器打开 |
| `src-tauri/src/modules/file_manager.rs` | [终端链接打开](features/终端链接打开.md) | 无 | 第三方文件管理器探测与打开命令 |
| `src/modules/terminal/lib/terminalCd.ts` | [终端路径历史](features/终端路径历史.md) | [终端链接打开](features/终端链接打开.md) | cd 命令构造与提交 |
| `src/modules/terminal/lib/pathHistory.ts` | [终端路径历史](features/终端路径历史.md) | 无 | 目录历史记录/封顶/筛选规则与跨工作区路径归一化 |
| `src/modules/terminal/lib/useVisiblePathHistory.ts` | [终端路径历史](features/终端路径历史.md) | [状态栏工作区与路径](features/状态栏工作区与路径.md) | 组合工作区环境与 automount root，产出当前视图可见历史 |
| `src/modules/terminal/path-history/PathHistoryDialog.tsx` | [终端路径历史](features/终端路径历史.md) | 无 | Ctrl+E 最近路径弹窗 |
| `src/modules/command-palette/lib/mode.ts` | [命令面板](features/命令面板.md) | [终端路径历史](features/终端路径历史.md) | `>` 前缀路径模式解析与 `#`/`?` 查询分流 |
| `src/modules/i18n/locales/zh/settings/models.ts` | [AI模型配置](features/AI模型配置.md) | 中文文案 | 与英文词典同构 |
| `src/modules/source-control/useSourceControlPanel.ts` | [AI提交信息生成](features/AI提交信息生成.md) | 源代码管理 | 生成流程编排与 Conventional 校验/修复重试 |
| `src/modules/ai/config/prompts.ts` | [AI提交信息生成](features/AI提交信息生成.md) | [AI模型配置](features/AI模型配置.md) | 内置提示词全文与取值（会话 full/lite + 提交信息） |
| `src/settings/sections/AgentsSection.tsx` | [AI提交信息生成](features/AI提交信息生成.md) | [设置页](features/设置页.md) | AI 行为设置、提示词模块与各区域搜索锚点 |
| `src/modules/settings/openSettings.ts` | [设置页](features/设置页.md) | [AI面板](features/AI面板.md) | 设置 tab 打开注册表，深层组件经此调用 |
| `src/settings/sections/ShortcutsSection.tsx` | [撤销终端窗格拆分](features/撤销终端窗格拆分.md) | [终端命令与结果块](features/终端命令与结果块.md)、快捷键自定义、[设置页](features/设置页.md) | 保存用户覆盖键位、警告 Ctrl+R 冲突并提供逐行搜索锚点 |
| `src/modules/command-palette/CommandPalette.tsx` | [命令面板](features/命令面板.md) | 主题切换 | 面板 UI、查询模式分流与主题预览 |
| `src/modules/command-palette/commands.ts` | [命令面板](features/命令面板.md) | 无 | 命令清单注册与禁用态 |
| `src/modules/command-palette/lib/fuzzy.ts` | [命令面板](features/命令面板.md) | 无 | 命令模糊匹配打分 |
| `src/modules/command-palette/lib/mru.ts` | [命令面板](features/命令面板.md) | 无 | 会话内最近使用排序 |
| `src/modules/command-palette/hooks/useContentSearch.ts` | [命令面板](features/命令面板.md) | 无 | `#` 内容搜索异步查询 |
| `src/settings/sections/AboutSection.tsx` | [设置-关于](features/设置-关于.md) | [设置页](features/设置页.md)、[应用更新](features/应用更新.md) | 关于分区 UI、仓库链接、更新/源码搜索锚点与文件/注册表痕迹清单；复用全局更新状态并一键安装 |
| `src-tauri/src/modules/traces.rs` | [设置-关于](features/设置-关于.md) | 无 | `app_traces`：安装、配置、数据、缓存、日志、注册表与凭据痕迹 |
| `src/modules/updater/useUpdater.ts` | [应用更新](features/应用更新.md) | [设置-关于](features/设置-关于.md)、[代理](features/代理.md) | 全局更新状态机、启动自动检查、通知消息与下载安装；检查/下载遵循更新场景代理 |
| `src/settings/sections/ProxySection.tsx` | [代理](features/代理.md) | [设置页](features/设置页.md) | 代理设置分区 UI 与搜索锚点 |
| `src/modules/proxy/components/ProxyStatusButton.tsx` | [代理](features/代理.md) | 状态栏 | 状态栏三场景代理开关与「刷新终端生效」提示 |
| `src/modules/proxy/components/TerminalProxyBadge.tsx` | [代理](features/代理.md) | 状态栏 | 左侧隐私徽章旁的绿色「代理：终端命令已生效」徽章 |
| `src/modules/proxy/lib/proxy.ts` | [代理](features/代理.md) | 无 | 代理 URL 解析与场景判定 |
| `src/modules/proxy/lib/terminalProxyRegistry.ts` | [代理](features/代理.md) | 无 | 终端会话创建时的代理快照登记表（leafId → URL），由 `useGhosttyTerminalSession` 读写 |
| `src/modules/proxy/lib/autoLaunch.ts` | [代理](features/代理.md) | [通知中心](features/通知中心.md) | 代理软件自动启动触发与失败通知 |
| `src-tauri/src/modules/proxy.rs` | [代理](features/代理.md) | 无 | 代理软件进程检测与启动 |
| `src-tauri/src/modules/net/clients.rs` | [代理](features/代理.md) | AI 会话 | reqwest 客户端缓存，代理地址纳入缓存键 |
