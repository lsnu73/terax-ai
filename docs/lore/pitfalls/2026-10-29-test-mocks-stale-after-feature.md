# 手写 mock 与被测对象新增依赖漂移：window/model 桩缺方法、合成点击被 trackClick 判为双击

- 首次出现：2026-10-29（`pnpm test` 三个终端测试文件共 10 个用例失败）
- 影响范围：`WebGlTerminalSurface.test.ts`、`TerminalSelectionController.test.ts`、`AdaptedGhosttyGpu.test.ts`
- 复现条件：在 b37cda2（ctrl+click 链接 + 手动连击追踪）之后的源码上跑未同步的旧测试夹具

## 表象

- `WebGlTerminalSurface.test.ts` 7 个用例报 `window.addEventListener is not a function`；
- `TerminalSelectionController.test.ts` 2 个用例在 pointerup / lostpointercapture 后 `tracked()` 仍不是 null，并伴随 `this.options.model.wordRangeAt is not a function` 未捕获异常；
- `AdaptedGhosttyGpu.test.ts` 的 10 万次 renewal 用例在机器负载高时偶发超时失败（实测 5023ms，紧贴 vitest 默认 5s）。

## 根因

b37cda2 给被测对象加了新依赖，三个测试夹具没跟上：

1. `WebGlTerminalSurface` 构造函数新增 `window.addEventListener("keydown"/"keyup")`（链接修饰键跟踪），测试的 `vi.stubGlobal("window", {...})` 桩没有这两个方法；
2. `TerminalSelectionController.trackClick()` 把「500ms 内、同一行、列差 ≤ 1」的两次 pointerdown 判为双击，进入选词模式后调用 `model.wordRangeAt()`，测试的模型桩没有这个方法。异常在 `handlePointerUp` 内抛出，跳过了选区清理逻辑，断言因此看到残留的 stale selection。更隐蔽的一层：两个用例的第二次合成点击（第 2 列、第 1 列）恰好落在首次点击的相邻列上，**语义上已被产品行为改判为双击**——只补 mock 方法测试仍不会过，必须同时把第二次点击移到不相邻的列；
3. renewal 用例循环 100,050 次真实 WASM 更新，耗时紧贴默认 5s 超时，负载一高就失败。

## 已采用的修复

- window 桩补 `addEventListener` / `removeEventListener`（`vi.fn()`）；
- 模型桩补 `wordRangeAt` / `lineEndColumn`；两个选区用例的第二次点击移到第 5 列（clientX 55），保持「另一次单击」的测试意图，并加行内注释说明原因；
- renewal 用例声明 `{ timeout: 30_000 }`。

## 复发防护

- 规则：给 Surface / 控制器新增对全局对象（`window` / `document`）或模型方法的调用时，必须同步更新对应测试夹具的手写桩——这些桩用 `as unknown as X` 强转，缺方法在编译期不报错，只会在运行期炸；
- 规则：合成 pointer 序列时，两次 pointerdown 若间隔 ≤ 500ms、同一行且列差 ≤ 1，就是双击/三击；想表达「另一次单击」必须拉开行距或列距；
- 规则：压测型用例（万次级真实 WASM 循环）必须显式声明 `{ timeout }`，不能依赖默认 5s。
