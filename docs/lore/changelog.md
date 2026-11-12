# 地图修改时间线

只记录地图自身的重要修订，不记录与地图无关的代码变更。

- 2026-10-23 初始化地图（README/map/glossary/invariants 建档）；新增决策 1 条（设置窗口层级）、约束 2 条（INV-001 macOS parent+置顶互斥、INV-002 设置窗口禁止置顶浮动）、坑点 1 条（Windows 构建网络环境）。
- 2026-10-28 归档模型配置重构：map 新增「AI 与模型配置」四个模块条目；README 核心概念增至 4 条；glossary 新增 Provider/模型配置/ParamDef/思考档位/映射/adapter/钥匙串账户等 8 个术语；invariants 新增 5 条（INV-003 配置唯一事实来源、INV-004 Key 不入 JSON、INV-005 参数保护键与 null 省略、INV-006 UI/手改同一校验链路、INV-007 密钥读取依赖已 hydrate 配置）；decisions 新增 3 条（数据驱动参数方案、逐模型思考档位、独立 JSON + 显式 Reload）；pitfalls 新增 2 条（直改 JSON 不生效/覆盖风险、配置未 hydrate 读取钥匙串）。其中 2 条坑点的复发防护暂无自动化测试，已标注需手工验证。
- 2026-10-28 归档模型设置页双模式编辑改造：decisions 新增 1 条（表单/JSON 双模式编辑）；pitfalls 新增 1 条（受控表单 onChange 覆盖与父值回写）；invariants 新增 1 条（INV-008 配置项必须带 info 悬浮说明，口头约定）；glossary 新增 3 个术语（双模式字段/emptyValue/InfoHint）；map 修订「模型设置页与思考滑块」条目纳入 StructuredFields。
- 2026-10-28 语音功能整体移除：修订 README（项目简介删语音输入）、map（keyring 条目删 STT 独立账户）；pitfalls 新增 1 条（pointer 事件 preventDefault 吞掉 mouse 事件 + pointerdown.detail 恒为 0，导致链接点击与双击选词失效）。无新增约束与决策。
- 2026-10-28 归档全量 i18n 改造与启动崩溃修复：map 新增「i18n」模块条目并修订「前端主应用」（顶层 await 入口 + visible:false 的启动陷阱）；decisions 新增 1 条（react-i18next 架构选型）；pitfalls 新增 1 条（i18n 循环依赖 TDZ 致窗口永不出现，含注入脚本排查手法）；invariants 新增 1 条（INV-009 i18n 禁止静态依赖上层模块，暂无自动化强制）。
- 2026-10-28 i18n 全量提取收尾：decisions 修订 i18n 架构条目（补「字典组织约定」「翻译边界：LLM prompt/持久化数据/专有名词/Rust 层不翻」）；invariants 新增 1 条（INV-010 新增文案必须 en/zh 同步进字典，zh 靠 `typeof en` 编译期强制）；glossary 新增 4 个术语（labelKey 模式、模块级 t()、双字典同构、语言偏好）。无新增坑点。
- 2026-10-29 归档模型设置页表单视觉分组修复（空态提示与按钮收进同一虚线框、结构化区块间距拉开、档位 ID 提示重写、窄输入框占位符截断修复）：invariants 新增 1 条（INV-011 空态提示与操作按钮同容器、区块间距大于内部间距，口头约定）。无新增决策与坑点。
- 2026-10-29 归档终端测试 mock 漂移修复（b37cda2 后 window 桩补监听器、模型桩补 wordRangeAt/lineEndColumn、合成点击拉开列距避免被 trackClick 误判为双击、10 万级压测用例显式超时）：pitfalls 新增 1 条（手写 mock 与被测对象新增依赖漂移）。无新增约束与决策。
- 2026-10-29 归档设置页四项改造（内容宽度跟随窗口、配置文件改为「在系统中打开」按钮、获取模型列表按钮移位、系统提示词管理模块）：decisions 新增 1 条（系统提示词三级继承 + 文本覆盖 + 自定义强制拼接工具协议尾段）；architecture/model-configuration.md 新增 1.1 节；ai-models.schema.json 增补 prompts/三级 systemPrompt；pitfalls 新增 1 条（opener allow-open-path 需同时声明 path scope，字符串权限只放行命令不放行路径）。无新增约束。
- 2026-10-29 归档设置页命名与归属调整：「系统提示词管理」从模型页迁入原「代理」页，页面更名「AI 行为」（「代理」易被误解为网络代理），页内「代理」列表更名「角色」（输入栏切换器与命令面板文案同步改名）；按钮的 InfoHint 改为内嵌按钮边框右侧（InfoHint 新增 nested 变体，span 渲染避免按钮套按钮）；结构化表单提示文案去箭头符号、改用语义化描述。无新增约束/决策/坑点。
- 2026-10-29 修复「在系统中打开」点击无反应并改为第三方文件管理器优先：新增 Rust 命令 `open_ai_config_dir`（`src-tauri/src/modules/file_manager.rs`，注册表默认动词 → App Paths/常见安装目录探测 → explorer 回退），前端 `openPath` 调用改为 `invoke`，移除已不再需要的 `opener:allow-open-path` scope，并在按钮下方显示打开失败原因；pitfalls 新增 1 条（openPath / SHOpenFolderAndSelectItems 在 Windows 固定 Explorer，忽略第三方默认处理器），原 opener scope 坑点标注为已被取代。无新增约束与决策。
- 2026-10-30 归档开发者工具、终端链接、预览端口与动态快捷键提示改造：map 新增「开发者工具」「终端链接打开」「快捷键注册与提示」「预览端口配置」四个模块条目；decisions 新增 2 条（发行版启用开发者工具、预览端口预设按稳定标识持久化）；invariants 新增 1 条（INV-012 快捷键提示必须从注册表与用户偏好动态生成，暂无 Lint 自动强制）；无新增坑点。
- 2026-10-30 归档独立 AI 窗口：map 新增单聊天引擎跨 webview 依赖，README 修订三窗口概念；decisions 新增 1 条（AI 窗口采用快照与命令桥），pitfalls 新增 1 条（同步窗口命令阻塞 Windows 事件循环）；修订 DevTools 旧快捷键说明。无新增约束。
- 2026-10-30 归档终端统一命令与结果块：map 新增块会话、双右键菜单与历史搜索跨模块依赖，README 核心概念增至 5 条；decisions 新增 1 条（复用 OSC 133 块管线并统一所有终端）；invariants 新增 2 条（INV-013 选区菜单优先、INV-014 Ctrl+R 全局保留）。无新增坑点。
- 2026-10-30 修正统一块化的方向性偏差（第一版误把所有终端切到隐藏提示符加共享输入的命令块输入方式）：decisions 修订同日条目（块只作叠加装饰、保持原生输入）；map 修订块条目（删除共享输入与 CodeMirror 历史弹层依赖）；invariants 修订 INV-014 强制点（Ctrl+R 交给 Shell 原生历史搜索）。无新增约束与决策。
- 2026-11-02 归档设置选项搜索：decisions 新增 1 条（静态索引与稳定锚点）；invariants 新增 1 条（INV-015 索引与目标锚点必须同步，暂无代码强制）；map 新增设置搜索的索引—分区—锚点依赖。无新增坑点。
- 2026-11-02 归档命令块查找焦点修复：pitfalls 新增 1 条（菜单焦点恢复覆盖独立搜索框）；invariants 新增 1 条（INV-016 全文与局部查找共享 SearchInline，暂无自动化强制）；decisions 修订终端统一块条目的搜索决策；map 补充局部控制器到共享弹窗的跨模块依赖。
- 2026-11-04 归档设置页左侧导航与搜索结果分组：decisions 新增 1 条（左侧固定栏采用搜索优先的竖向导航，结果按分区独立分组，浮层脱离导航栏宽度）；map 修订设置选项搜索条目，补充命中项到分区分组的局部依赖。无新增约束与坑点。
- 2026-11-07 归档关闭方式与托盘的退出取舍及单实例注册顺序：decisions 新增 1 条（托盘「关闭程序」直接结束进程，不依赖前端存活）；invariants 新增 1 条（INV-017 单实例插件必须最先注册，暂无代码强制）。无新增坑点。
- 2026-11-08 归档无边框窗口边缘交互：decisions 新增 1 条（阀段与原生 resize 分流，最大化时整条边框让渡给侧栏操作）；invariants 新增 2 条（INV-018 最大化四角不得留透明真空、INV-019 边缘交互必须与 tao 原生 resize 命中互补，均暂无自动化强制）；pitfalls 新增 1 条（最大化后四角点击穿透，根因为透明窗口上的 CSS 圆角真空像素）；map 新增「无边框窗口边缘交互」条目（含 DOM 镜像与 React hook 双通道依赖）；glossary 新增「拖拽阀」术语。同步 atlas 功能文档的 lore 交叉引用。
- 2026-11-08 归档收起态拖阀渐进展开与更新器超时语义：pitfalls 新增 2 条（面板库 minSize 硬钳制吞掉渐进展开、Tauri updater 的 timeout 是整请求超时）；invariants 新增 1 条（INV-020 亚最小宽度展示必须手势期降 0 + begin/end 配对，暂无自动化强制）；map 修订无边框窗口边缘交互条目的易错点。同步 atlas「无边框窗口与边框交互」「应用更新」的 lore 交叉引用。
- 2026-11-11 归档浮层外部关闭与 WSL 块模式环境传递：pitfalls 新增 2 条（终端停止冒泡导致菜单残留、WSL 丢失 `TERAX_BLOCKS` 导致分隔线错位）；map 补充 Radix 冒泡监听与终端选区、WSLENV 与 Shell 间隔的隐性依赖。无新增约束与决策。
- 2026-11-12 归档最近路径跨工作区归一化：pitfalls 新增 1 条（路径历史混格式存储，归一化只能在读取侧）；map 新增「最近路径跨工作区归一化」条目，覆盖 `normalizePathHistoryForEnv` 与 `wsl.conf` automount root 缓存依赖。无新增约束与决策。
