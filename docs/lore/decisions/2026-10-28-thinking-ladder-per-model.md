# 思考档位由每个模型自行声明，无档位模型不显示滑块
- 日期：2026-10-28
- 状态：已采纳
- 关联约束：INV-003、INV-005
- 关联坑点：无

## 背景

终端场景下“输入提示词 → 输出命令”通常确定性很强（例如“当前路径是什么”永远对应 `pwd`），思考只增加延迟。产品要求 Ctrl+I 的模型选择窗提供滑块：最左关闭思考，向右逐级增强。

但厂商的思考控制方式完全不统一：

- 智谱：默认 `max`；GLM-5.3 只接受 `low/high/max`；GLM-5.2 会把 `low/medium` 映射为 `high`、`xhigh` 映射为 `max`、`none/minimal` 表示放弃思考；关闭还要把 `thinking.type` 设为 `disabled`。
- Qwen：布尔 `enable_thinking` + 数字 `thinking_budget`。
- 豆包：`thinking.type` 的 `disabled/auto/enabled` 三态。
- DeepSeek/Kimi 等多个内置 Provider 没有可切换的思考参数。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A（最终采用）：每个模型（或 Provider 兜底）声明自己的 `thinking.levels`，滑块档位直接来自该数组 | 档位数量、标签、默认值、映射全部数据化；同一套代码支持 2 档/4 档/5 档；关闭思考可同时改多个参数 | 配置比“全局 5 档”长；模型行需要维护 |
| B：全局固定 0–5 档，代码按 Provider 映射 | UI 统一 | 映射逻辑回到代码；无法表达某模型只支持 3 档；新增厂商仍要改代码 |
| C：滑块只改一个 `reasoning_effort` 数字 | 实现最简 | 智谱需要 `thinking.type` 联动关闭；Qwen 是布尔+预算，根本不适用 |

## 结论与理由

选 A。滑块索引 0 恒为关闭，档位的 `values` 通过参数声明的 `map` 转成厂商实际取值；映射结果为 `null` 时整键省略。GLM-5.2 的 `medium → high`、`xhigh → max` 都写在 `defaults.ts` 的 `map` 与档位表里，没有代码分支。

对没有声明 `thinking.levels` 的模型（DeepSeek、Kimi 等），**不渲染滑块**，而不是伪造一个“关闭”档位——否则用户会误以为思考已关闭。行内补全与子代理强制使用最左档位，以降低按键与工具调用的延迟。

**未来什么条件下应重新评估**：如果国内厂商最终收敛到统一的 `reasoning_effort` 枚举（例如全部接受 `minimal/low/medium/high`），可以增加一个共享的默认阶梯模板减少配置重复；但 `map` 机制仍应保留，用于未跟进的厂商。
