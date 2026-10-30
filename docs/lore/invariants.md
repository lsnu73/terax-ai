# 不可违反的硬约束

每条约束带唯一编号、违反代价与代码强制点。新约束追加在末尾，编号不复用。

- **INV-001** macOS 上禁止给设置窗口同时设置 parent 与 always_on_top。
  - 违反代价：破坏 WebView 合成，设置窗口可能藏到主窗口后面（上游 issue #33、#957）。
  - 强制点：`src-tauri/src/lib.rs` 的 `open_settings_window`——当前实现完全不使用 always_on_top，从结构上杜绝该组合。

- **INV-002** 设置窗口不得以 always_on_top 浮动于其他应用之上；其层级必须与主窗口一致（主窗口的子窗口、普通层级）。
  - 违反代价：用户切换到其他软件后设置窗口仍钉在屏幕上（2026-10-23 报告的 bug）。
  - 强制点：`src-tauri/src/lib.rs` 的 `open_settings_window`（builder 不再设置 `always_on_top`，已有窗口分支不再调用 `set_always_on_top`）。
  - ⚠️ 此条暂无自动化测试强制（原 `settings_float_only_outside_macos` 测试随修复一并删除），靠代码评审把关。

- **INV-003** 模型配置的唯一事实来源是应用数据目录下的 `terax-ai-models.json`；运行时不得硬编码厂商参数名、思考取值或模型清单。
  - 违反代价：新增/调整国内厂商又要改代码并重新发版；厂商改名参数时全量请求静默失败。
  - 强制点：`src/modules/ai/config/defaults.ts` 只提供种子数据；所有请求参数经 `resolveRequestParams`（`config/params.ts`）从配置生成；`agent.ts` 仅按封闭的 `protocol` 枚举分支。

- **INV-004** API Key 只允许存操作系统钥匙串；`terax-ai-models.json` 里只能出现 `keyringAccount` 账户名。
  - 违反代价：明文密钥进入可备份/可同步的配置文件，造成泄露。
  - 强制点：`normalizeProvider()` 会移除 `headers` 中的 `Authorization` / `x-api-key` / `api-key` / `x-goog-api-key` 并产生 warning；密钥读写只经 `keyring.ts`。

- **INV-005** 合并请求参数时必须保留传输层保护键，思考档位的映射结果 `null` 表示省略该键。
  - 违反代价：用户 `extra` 覆盖 `model` / `messages` / `stream` / `tools` 会直接破坏请求；把 `null` 当成真实值发送会让「关闭思考」被厂商拒绝。
  - 强制点：`config/params.ts` 的 `PROTECTED_BODY_KEYS` / `PROTECTED_HEADERS`；`resolveRequestParams` 把映射为 `null` 的参数丢弃；`config.test.ts` 有对应断言。

- **INV-006** UI 编辑与手工编辑 JSON 必须走同一条 `normalizeAiConfig` 校验链路；手工改文件后由用户显式触发 Reload，不做文件监听。
  - 违反代价：两条写入路径产生不同结构，或监听与未保存草稿互相覆盖。
  - 强制点：`useAiConfigStore.replace()` 与 `persist.readAiConfig()` 都调用 `normalizeAiConfig`；`ModelsSection` 的 “Reload from disk” 是唯一手工重载入口。

- **INV-007** 钥匙串账户列表只能来自已 hydrate 的配置快照；Provider 增删或配置重载后必须重新读取密钥。
  - 违反代价：已保存的 API Key 全部表现为“未配置”，AI 输入框不可用（见 pitfalls/2026-10-28-keys-before-config-hydration.md）。
  - 强制点：`src/modules/ai/hooks/useAiBootstrap.ts` 的密钥 effect 以 `configHydrated` 门控并依赖 `config`；`src/settings/sections/ModelsSection.tsx` 的 `getAllKeys()` effect 依赖 `config`。
  - ⚠️ 此条暂无自动化测试强制，靠启动时序评审与手工回归把关。

- **INV-008** 设置页每个面向用户的配置项必须提供 info 悬浮说明，写清「改变它的后果」和「该填什么」；不能靠字段名让用户猜语义。
  - 违反代价：用户面对 `Thinking (JSON) = null` 这类正常但无解释的取值时无从下手（2026-10-28 实际反馈）。
  - 强制点：`src/settings/sections/models/StructuredFields.tsx` 的 `InfoHint` 组件；`ModelsSection.tsx` 的 `FieldRow` 接受 `info` 参数。
  - ⚠️ 此条暂无代码强制，属口头约定，靠新增设置项时的评审把关。

- **INV-009** `src/modules/i18n/` 是底层模块，禁止静态 import 任何上层模块（尤其是 `settings/preferences`、`settings/store` 方向）；组件外取文案用运行期 `t()`，不允许为了取值给 i18n 加静态依赖。
  - 违反代价：闭合 `settings/store → … → i18n → preferences → store` 这类循环，入口顶层 await 模块 TDZ 崩溃，窗口永不显示且无任何报错输出（见 pitfalls/2026-10-28-i18n-circular-import-tdz.md）。
  - 强制点：`i18n/index.ts` 对 preferences 的引用是 `initI18n()` 内的动态 `await import`；反向（上层模块 import i18n 用 `t()`）合法且鼓励。
  - ⚠️ 此条暂无自动化强制，靠代码评审把关。

- **INV-010** 任何新增的用户可见文案必须进 `src/modules/i18n/locales/` 字典且 en/zh 同步，禁止在组件里直接写英文字面量；发给 LLM 的 prompt、持久化数据默认值、专有名词除外（完整边界见 decisions/2026-10-28-i18n-architecture.md）。
  - 违反代价：界面中英混杂；只加 en 不加 zh 时中文用户看到英文兜底。
  - 强制点：zh 字典以 `: typeof en` 声明，en/zh 键不同构会让 `tsc` 编译失败——「漏译」在编译期必然暴露；「组件里新写死英文」暂无代码强制，靠评审把关。

- **INV-011** 设置页表单中，一个区块的空态提示与其主操作按钮必须放进同一个容器（虚线框），且相邻区块之间的间距必须明显大于区块内部元素的间距；按钮不得游离在两个区块之间、与上下等距。
  - 违反代价：按钮与相邻区块标题等距时，用户无法判断按钮属于上方还是下方区块（2026-10-29 实际反馈：Params 的「添加参数」被误认为可能属于 Thinking）。
  - 强制点：`src/settings/sections/models/StructuredFields.tsx` 的 `ParamsForm` / `KeyValueEditor` 空态把提示与按钮收进同一虚线框；`ModelsSection.tsx` 两个编辑器把结构化字段包进独立的 `gap-4` 容器。
  - ⚠️ 此条暂无代码强制，属口头约定，靠评审把关；固定宽度输入框（如 `w-40`）里的占位提示同理必须能在该宽度内完整显示，长示例放 InfoHint 而非 placeholder。

- **INV-012** 面向用户展示的快捷键必须从 `ShortcutId` 注册表和用户偏好动态生成，禁止在按钮提示、菜单或 placeholder 中硬编码键名。
  - 违反代价：用户改键后提示仍显示旧键位，界面给出错误操作指令。
  - 强制点：`src/modules/shortcuts/components/ShortcutTooltip.tsx` 的 `ShortcutTooltip` / `ShortcutHint`，以及 `src/modules/shortcuts/lib/useShortcutTokens.ts` 的 `useShortcutHint` / `shortcutHintLabel`；所有文案统一从 `src/modules/shortcuts/shortcuts.ts` 的 `SHORTCUTS` 与 preferences 的 `shortcuts` 取值。
  - 注意：此条暂无 Lint 自动强制，新增带快捷键的按钮必须使用上述公共 API，靠代码评审把关。
  - 代码索引：见 [atlas/features/快捷键提示.md](../atlas/features/快捷键提示.md)。
