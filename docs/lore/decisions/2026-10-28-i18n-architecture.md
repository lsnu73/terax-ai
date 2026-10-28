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
