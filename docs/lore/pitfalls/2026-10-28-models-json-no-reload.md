# 直接编辑 terax-ai-models.json 不生效，甚至可能被默认值覆盖
- 首次出现：2026-10-28（设计/实现阶段识别，未在用户环境实际发生）
- 影响范围：所有手工编辑模型配置的用户；设置页与主窗口的配置一致性
- 复现条件：应用运行期间用外部编辑器修改 `terax-ai-models.json`，不点设置页的 “Reload from disk”；或在文件格式损坏时依赖应用自动修复

## 表象

1. 改了 JSON、保存，Ctrl+I 的模型列表/思考档位仍是旧的；
2. 更严重的情况下，重启应用后手写的 Provider 消失，文件被内置目录替换。

## 根因

`plugin-store` 的 `LazyStore` 在内存中缓存已加载的键值，`onChange` 只反映本进程的写入；外部编辑不会触发任何事件。此外，“文件没有 `providers` 键”无法区分两种情况：

- 文件确实不存在（应该播种内置目录）；
- 文件存在但 JSON 解析失败（绝不能覆盖用户内容）。

如果读取失败后仍按“缺失”处理并写入默认值，就会把用户手写的配置清掉。

## 已采用的修复

- `src/modules/ai/config/persist.ts` 的 `readAiConfig()` 先 `store.reload({ ignoreDefaults: true })`，并记录 `reloadError`；
- 只有 **无 reloadError 且没有 providers 键** 时才播种内置目录并写盘；有 reloadError 时仅在内存回退到内置目录并返回 warning，不写文件；
- 设置页提供显式的 “Reload from disk” 按钮，并在顶部展示完整文件路径；
- 写盘统一走 `writeAiConfig()`，同时广播 `terax://ai-models-changed`，让另一个窗口重读。

## 复发防护

- 约束：INV-006（UI 与手改共用 normalize，直改需显式 Reload）；
- 代码分支：`readAiConfig()` 的 `reloadError` 判断是防止覆盖的关键，重构该方法时必须保留；
- ⚠️ 暂无自动化测试覆盖（`LazyStore` 依赖 Tauri 运行时，单测环境无法直接验证）；改动该文件后需手工验证“坏 JSON 不被覆盖”与“Reload 后新配置生效”两条路径。
