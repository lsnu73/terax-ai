# 模型配置使用独立 JSON 文件 + 显式 Reload，不做文件监听
- 日期：2026-10-28
- 状态：已采纳
- 关联约束：INV-003、INV-006
- 关联坑点：pitfalls/2026-10-28-models-json-no-reload.md

## 背景

需求要求 Provider、模型、参数、token 数全部落盘 JSON，且用户既能用设置页增删改，也能直接编辑该 JSON 达到同等效果。现有偏好（主题、字体、快捷键等）存放在 `terax-settings.json`，由 Tauri `plugin-store` 的 `LazyStore` 管理，并通过 `writePref` 广播跨窗口事件。

模型配置有三个额外要求：

1. 结构较大（providers → models → params → thinking），希望文件本身可读、可嵌套；
2. 设置窗口与主窗口都可能读写；
3. 手工编辑与 UI 编辑不能互相覆盖。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A（最终采用）：独立 `terax-ai-models.json`，三个顶层键 `version/defaults/providers`；同一 `LazyStore`，读盘用 `reload()`，写盘后广播 Tauri 事件；手工修改后点 “Reload from disk” | 文件是干净的可手改 JSON；结构自由；与现有 store 机制一致；不会把模型配置混进偏好键值 | 直改文件不会自动生效，需要一次显式操作；`LazyStore` 的内存缓存与磁盘可能短暂不一致 |
| B：继续存在 `terax-settings.json` 的扁平键里 | 复用现成机制 | 嵌套结构会被拆成多个键，手改体验差；模型增删牵动多个键，容易半写 |
| C：独立文件 + 文件系统监听（`fs.watch`）自动重载 | 直改立即生效 | 与设置页未保存草稿竞争：用户正在编辑时文件被外部改动会自动覆盖或丢失草稿；跨平台监听语义不一致 |
| D：SQLite / 其他数据库 | 查询与并发更强 | 违背“可手改 JSON”的产品要求，且引入原生依赖 |

## 结论与理由

选 A。具体实现（`src/modules/ai/config/persist.ts`）：

- 首次启动文件缺失时，把内置厂商目录写入一次，保证所有 Provider 真正落盘；文件损坏时**不覆盖**，只在内存回退并给出 warning。
- 读取时先 `store.reload({ ignoreDefaults: true })`，让外部编辑可见；写入后 `emit("terax://ai-models-changed")`，另一个窗口重读。
- 设置页顶部展示完整文件路径与 “Reload from disk” 按钮，把“直改后需要重载”变成显式、可发现的操作。
- 所有写入（UI 与后续可能的命令行）都必须经过 `normalizeAiConfig`，保证两种入口结构一致。

**未来什么条件下应重新评估**：

- 如果用户强烈需要“保存文件即生效”，可增加一个默认关闭的监听偏好，并在检测到外部变更时先弹确认，而不是静默重载；
- 如果模型配置膨胀到需要版本迁移脚本，应在 `version` 字段上实现逐版本 migrate，而不是继续靠 normalize 的宽容解析。
