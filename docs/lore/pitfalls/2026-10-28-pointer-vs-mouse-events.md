# 终端里点击链接与双击选词都无效：挂在 mouse 事件与 event.detail 上的逻辑被 pointer 事件架空
- 首次出现：2026-10-28（用户反馈：链接点不开、`git status` 双击 status 选不中）
- 影响范围：两个终端渲染面（`WebGpuTerminalSurface` / `WebGlTerminalSurface`）的链接点击；`TerminalSelectionController` 的双击/三击
- 复现条件：普通 shell（无 mouse tracking）下，鼠标悬停输出中的 URL 单击，或对任意单词双击

## 表象

- 终端输出的链接悬停时有手型光标，但点击没有任何反应；
- 双击一个单词不触发选词，三击也不选行。

## 根因

两个症状同根：**选区控制器挂在 pointer 事件上，而链接与多击逻辑挂在 mouse 体系上**。

1. `TerminalSelectionController` 在每次 `pointerdown` 上调用 `preventDefault()`。按 Pointer Events 规范，取消 `pointerdown` 会抑制后续全部兼容性鼠标事件（`mousedown` / `mouseup` / `click`），因此写在 `mousedown` / `mouseup` 上的链接打开逻辑永远不会执行。
2. `pointerdown` 事件的 `detail`（连击计数）在 Chromium 系 WebView 中恒为 0，`event.detail === 2 ? "word" : ...` 永远不成立。

## 已采用的修复

- 链接处理从 `mousedown` / `mouseup` 改为 `pointerdown` / `pointerup`，并要求按住 Ctrl/Cmd 才打开（`linkModifierHeld()`，`src/modules/terminal/lib/terminalLinks.ts`）；光标只在按住修饰键悬停链接时显示手型（window 级 keydown/keyup 跟踪修饰键）；
- `TerminalSelectionController` 新增 `trackClick()`：按「间隔 ≤ 500ms 且同一行、列差 ≤ 1」自行累计连击数，`event.detail` 仅作下限参考；
- `shouldStartTerminalSelection` 在按住 Ctrl/Cmd 时直接返回 false，Ctrl+点击不再触发选区。

## 复发防护

- 规则：**终端根元素上的交互一律用 pointer 事件**，禁止新增 `mousedown` / `mouseup` / `click` 处理器——它们会被选区控制器的 `preventDefault` 静默吞掉；
- 规则：连击判定禁止依赖 `event.detail`，必须用 `trackClick()` 的自追踪计数；
- ⚠️ 暂无自动化测试覆盖真实 WebView 事件流（单测里 detail 是手工构造的）；改动 Surface 指针处理后，需手工验证「Ctrl+点击开链接」「双击选词」「三击选行」「普通拖选」四条路径。
