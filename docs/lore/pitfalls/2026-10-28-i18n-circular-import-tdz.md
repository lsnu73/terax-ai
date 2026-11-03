# `pnpm tauri dev` 编译正常但窗口永不出现：i18n 循环依赖 TDZ 杀死入口模块

- 首次出现：2026-10-28
- 影响范围：整个应用（主窗口与设置窗口都无法启动）；任何在「i18n 上层模块」里新增静态 import 的改动都可能复发
- 复现条件：在 `src/modules/agents/lib/launcher.ts`（或其它被 `settings/store.ts` 静态依赖的模块）里加 `import { t } from "@/modules/i18n"`

## 表象

`pnpm tauri dev` 全部编译通过，终端停在 `Running target\debug\terax.exe` 再无输出，窗口不出现，任务管理器里进程活着。浏览器打开 devUrl 空白页，`#root` 里只剩 index.html 的占位 `<div id="terminal">`，控制台报：

```
ReferenceError: Cannot access 'DEFAULT_PREFERENCES' before initialization
    at src/modules/settings/preferences.ts (zustand create)
```

## 根因

`launcher.ts` 新增的 `import { t }` 闭合了一条静态依赖环：

```
settings/store.ts → agents/lib/launcher.ts → i18n/index.ts → settings/preferences.ts → settings/store.ts
```

ESM 求值到 `preferences.ts:48` 的 `create()` 时，`store.ts` 才执行到第 2 行，`DEFAULT_PREFERENCES`（store.ts:276）尚未初始化，触发 TDZ。而 `main.tsx` 是顶层 await 模块，崩在中途意味着：

1. React 从未 `createRoot`（页面空白）；
2. `main.tsx:49-56` 的 `window.show()` 从未注册，而 `tauri.conf.json` 配置了 `"visible": false`（窗口由前端首屏后负责显示）——进程活着但窗口永远隐藏，终端观感就是"卡死在最后一行"。

## 已采用的修复

`src/modules/i18n/index.ts` 改为在 `initI18n()` 函数体内 `await import("@/modules/settings/preferences")`（该函数本来就是 async），断开 `i18n → preferences` 这条静态边。launcher 里的 `t()` 用法保留不动——`t()` 只在函数体内运行期调用，问题从来不在调用时机，而在静态 import 边。

## 复发防护

- 约束条目：INV-009（i18n 禁止静态依赖上层模块）。
- 排查手法（下次"编译正常但窗口不出现"时直接照做）：
  1. 窗口 `visible:false` + 前端 `show()` 的架构决定了「进程活着没窗口」几乎必然是 `main.tsx` 顶层模块崩了；
  2. 浏览器打开 devUrl，注入 `<script type="module">import('/src/main.tsx?probe=...').catch(...)</script>` 重放入口模块，能拿到原始报错与堆栈（注意：devtools evaluate 里直接写 `import()` 会被宿主转译成 `importModule`，报 `importModule is not defined` 是探针假象，必须用注入脚本的方式）；
  3. 看到 `Cannot access 'X' before initialization` 基本就是循环依赖，沿 import 链找环即可。
- ⚠️ 暂无自动化循环依赖检测（可考虑引入 madge/dependency-cruiser 到 CI），靠本条与 INV-009 评审把关。
