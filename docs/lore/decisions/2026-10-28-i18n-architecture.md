# 全量 i18n 架构：react-i18next + 偏好语言 + system 跟随操作系统

- 日期：2026-10-28
- 状态：已采纳
- 关联约束：INV-009
- 关联坑点：pitfalls/2026-10-28-i18n-circular-import-tdz.md

## 背景

界面文案原本全部是硬编码英文，散落在上百个组件里。需要支持中文，且语言偏好要与设置系统打通（`language: "system" | "en" | "zh"`，system 按 `navigator.language` 判定，zh-* 进中文，其余一律英文）。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A（最终采用）react-i18next + 模块级 `t()` | 生态成熟，组件内 `useTranslation`、组件外 `t()` 双通道；语言切换免刷新 | 顶层 await `initI18n` 之前组件不得渲染（`useTranslation` 会 suspend） |
| B 自研字典 + Context | 零依赖、可控 | 复数/插值/切换订阅都要自己造，上百个调用点改造量不变 |
| C 编译期按语言出两份包 | 运行时零开销 | 无法运行时切换语言，与「设置里改语言即时生效」冲突 |

## 结论与理由

选 A。两个入口（`src/main.tsx`、`src/settings/main.tsx`）都顶层 `await initI18n()` 再渲染，用启动顺序换运行期免 suspend。快捷键等结构化文案改为 `labelKey` 存翻译键、渲染时翻译（`shortcuts/shortcuts.ts`），避免配置层依赖 i18n。

**重新评估条件**：若未来文案需要按用户远程下发或做 A/B，react-i18next 的静态 resources 模式不够用时再考虑 i18next 后端插件或换方案。

## 字典组织约定

- 字典按模块拆文件：`src/modules/i18n/locales/{en,zh}/<module>.ts`（设置窗口再细分 `settings/<section>.ts`），由同级 `index.ts` 聚合成单一 `translation` 命名空间；键命名 `<模块>.<区域>.<语义名>`（camelCase）。
- **en 是基准语言**：zh 文件用 `: typeof <en导出>` 强制键结构同构，漏译会在 `tsc` 编译期报错，不靠人肉核对。
- 复数：en 写 `key_one`/`key_other`，zh 两键同值（中文无复数），调用处传 `count`；插值一律 `{{var}}`。
- 日期/数字格式化用 `currentLocale()`（`zh-CN`/`en-US`），禁止再写 `Intl.*("en-US")` 或无参 `toLocaleString()`（后者跟随 OS 而非界面语言）。
- 新增语言的路径：改 `LanguagePref` 枚举与 `resolveLanguage()`，在 `locales/` 下加一份 `typeof en` 同构字典，注册进 `resources`。

## 翻译边界（什么不翻）

- **发给 LLM 的内容不翻**：system prompt、工具 schema 描述、subagent 的 `description`（拼进 tool description）、`INIT_PROMPT` 等——翻译会改变模型行为。判断标准：字符串最终进入发给模型的消息体 → 保持英文。注意 `security.ts` 的拒绝原因是 dual-use（UI 展示 + tool result 回传模型），已翻译，zh 环境下模型会收到中文拒绝原因。
- **持久化数据不翻**：种进 `terax-ai-models.json` 的 provider 名/思考档位标签、`launcher.ts` 的默认命令 label、`"New chat"` 会话哨兵值（chatStore 比较逻辑与 sessions.test 依赖英文原值）、默认空间名等——翻译会把语言冻结在创建时刻并破坏已有数据。内置 agent 的 name 同理保持英文（它同时进 system prompt），UI 展示层按 `builtin:<short>` 查 `ai.agents.builtin.*` 键本地化（`AgentSwitcher.tsx` 的 `agentDisplay`，设置页 AgentsSection 复用同一函数）。
- **专有名词不翻**：品牌名（Terax/Claude/Codex…）、主题名（Dracula/Nord…）、框架与语言名（Vite/Next.js…）、代码语言名、快捷键组合、URL。
- **Rust 层不翻**：`src-tauri` 的 IPC 错误消息以 `toast` description 原样拼接展示，保持英文；设置窗口标题 `"Settings"` 在 `src-tauri/src/lib.rs`，改它要动 Rust，暂未处理。

> 修订于 2026-10-28：补充「字典组织约定」与「翻译边界」两节（全量提取完成后的收尾沉淀）。
