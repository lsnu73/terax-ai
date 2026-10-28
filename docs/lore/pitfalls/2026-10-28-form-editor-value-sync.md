# 受控表单编辑器中，连续 onChange 互相覆盖 / 本地编辑被父值回写重置
- 首次出现：2026-10-28（实现阶段识别并修复）
- 影响范围：`src/settings/sections/models/StructuredFields.tsx` 的 ThinkingForm、KeyValueEditor；任何「本地草稿 + 受控 onChange」结构的表单组件
- 复现条件：(a) 一次用户动作需要同时改两个派生字段，且分两次调用 onChange；(b) 子组件把父值同步进本地 state，而父值正是自己刚才 onChange 出去的

## 表象

- 在 Thinking 表单里重命名「默认档位」后，档位 id 改了但 `default` 指针仍指向旧 id（或反过来），保存后滑块默认档位错乱；
- 在键值对编辑器（Extra / Headers / 档位 values）里打字时，正在编辑的行突然被重置回上一个值，输入焦点丢失或内容回跳。

## 根因

两个坑同根：**父组件持有的唯一事实源与子组件的本地草稿不同步**。

1. ThinkingForm 的一次动作（重命名档位）派生两处变更：`levels[].id` 和 `default`。第一版实现连续调用两次 `onChange`，两次都基于同一个旧的完整对象计算，第二次 onChange 把第一次的结果整体覆盖——React 批处理下只保留最后一次。
2. KeyValueEditor 用本地 `rows` state 承接正在编辑的内容。每次 `onChange` 后父组件把序列化值回传，若用 `useEffect` 依赖父值同步本地 state，自己刚发出的值绕一圈回来，把包含中间编辑态的 `rows` 重置掉。

## 已采用的修复

`src/settings/sections/models/StructuredFields.tsx`：

- ThinkingForm：**一次用户动作只发一次 onChange**，把 `levels` 与 `default` 的变更合并进同一个新对象提交；
- KeyValueEditor：用 `signature` ref 记录自己上次 onChange 发出的序列化值；同步 effect 里比较父值与签名，**只有外部来源（Reload / 切换模式）造成的值变化才回写本地 rows**，自己发出的回环值直接跳过。

## 复发防护

- 代码约定：StructuredFields.tsx 内的 signature ref 与「单次合并 onChange」写法；
- 评审规则：任何「本地草稿 + 受控值」组件，同步 effect 必须区分「自己发出的回环值」与「外部值变化」；
- ⚠️ 暂无自动化测试覆盖；改动 StructuredFields.tsx 后需手工验证「重命名默认档位」和「键值对连续打字」两条路径。
