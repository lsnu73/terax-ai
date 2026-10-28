# 配置尚未 hydrate 就读取钥匙串，所有 Provider 都像“未配置”
- 首次出现：2026-10-28（实现阶段识别并规避）
- 影响范围：AI 输入框的可用性判断、设置页 Provider 的 “Configured” 徽标、自动补全的密钥加载
- 复现条件：应用启动时 `getAllKeys()` 早于 `useAiConfigStore.init()` 完成；或配置重载后没有重新读取密钥

## 表象

- 已保存的 API Key 全都不生效，模型下拉把 Provider 标成未配置；
- `hasComposer` 为 false，AI 输入框无法发送；
- 打开设置页后过一会儿又恢复正常（取决于渲染时序）。

## 根因

`keyring.getAllKeys()` 的账户列表来自 `allKeyringAccounts()`，它读取的是 `config/registry.ts` 当前的内存快照。启动时该快照先是 `defaultAiConfig()`（或空配置），而配置文件读取是异步的；如果先按空 Provider 列表去查钥匙串，得到的 Key 映射自然全空。

同类问题也会出现在新增 Provider 后：账户列表变了，但 Key 没有重新读取。

## 已采用的修复

`src/modules/ai/hooks/useAiBootstrap.ts`：

- 先 `initConfig()`，effect 内 `if (!configHydrated) return`；
- 密钥加载 effect 依赖 `configHydrated` 与 `config`，Provider 增删后自动重读；
- 设置页 `ModelsSection` 同样在 `useAiConfigStore` 的 `config` 变化后重跑 `getAllKeys()`（带 biome-ignore 说明这是 registry 外部读取）。

## 复发防护

- 约束：INV-007（钥匙串账户列表只能来自已 hydrate 的配置快照）；
- 代码依赖：`useAiBootstrap` 中 `configHydrated` 的门控与 `[config]` 依赖注释；
- ⚠️ 暂无自动化测试覆盖启动时序；改动 `useAiBootstrap` 或 `keyring.getAllKeys` 后，需手工验证“冷启动即有已保存 Key”和“新增 Provider 后新 Key 立即可用”两条路径。
