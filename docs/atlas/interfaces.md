# 对外接口契约与第三方对接

> 只登记「契约级」信息：URL / 方法 / 鉴权 / 关键请求响应字段 / 限流 / 错误码约定。
> 实现细节与调用链在 `features/`。
> 不写密钥本身，只写密钥的管理方式（环境变量名 / 密钥服务）。
>
> 数据快照：2026-11-25 取自内置目录 `src/modules/ai/config/defaults.ts`，未对厂商端点做独立联网核实；与通用经验 [playbook/大模型多厂商接入的配置驱动与请求参数合并.md](playbook/大模型多厂商接入的配置驱动与请求参数合并.md) §0.1 同源。探测发现不符时两处同时更正，并在各条目「变更记录」留痕。

## 对外 API

空 —— Terax 是桌面客户端，不对外提供 HTTP 服务，无入站路由。

## 消息队列

空 —— 不涉及消息队列。

## 第三方服务对接

内置目录共 11 个厂商条目（仅元数据，不含模型；模型由用户从模型列表拉取或手动填写），全部走 OpenAI 兼容协议。通用约定：

- 聊天：`POST {端点}/chat/completions`，请求体由 [features/AI模型配置.md](features/AI模型配置.md) 的合并规则生成。
- 鉴权：`Authorization: Bearer <密钥>`；代码另支持 `x-api-key` 头模式，内置条目未使用。
- 密钥：存操作系统钥匙串，配置只保存账户名；本文件只登记账户名。
- 模型列表探测：`GET {端点}{modelsApi.path}`（未配置时回退 `/models`），超时 15s，不重试；2xx 成功，401/403 鉴权失败，404 视为「端点可达但不提供模型列表」，其他状态码带响应片段报错。
- 传输：公网端点走标准代理；回环与私网段（`localhost`、`127.x`、`10.x`、`192.168.x`、`172.16–31.x`）走允许私网访问的代理。
- 聊天请求的超时、重试与限流未登记 `?`。
- 官方文档地址均未登记 `?`；下表只登记密钥控制台。

### 智谱 GLM（`zhipu`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://open.bigmodel.cn/api/paas/v4`
- 认证与密钥管理：Bearer；钥匙串账户 `zhipu-api-key`；控制台 <https://bigmodel.cn/usercenter/proj-mgmt/apikeys>。
- 模型列表：不提供（兼容端点无 `/models`）；模型 ID 需手动填写。
- 已知怪癖：思考强度 `reasoning_effort` 仅接受 `low` / `high` / `max`；关闭思考必须省略该参数，传 `"none"` 不被接受。代码注释称「兼容端点不提供模型列表」，与内置目录 `modelsApi: null` 一致。
- 降级方案：探测 404 按正常处理，模型由用户手动添加。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### DeepSeek（`deepseek`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://api.deepseek.com/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `deepseek-api-key`；控制台 <https://platform.deepseek.com/api_keys>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：基础路径必须带 `/v1`。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 阿里云百炼 Qwen（`dashscope`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `dashscope-api-key`；控制台 <https://bailian.console.aliyun.com/?apiKey=1>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：思考用布尔开关 `enable_thinking`（`true` / `false`）；单一参数阶梯无法同时表达「开关 + token 预算」。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 月之暗面 Kimi（`moonshot`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://api.moonshot.cn/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `moonshot-api-key`；控制台 <https://platform.moonshot.cn/console/api-keys>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：未发现（未独立核实）`?`。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 火山方舟 豆包（`volcengine`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://ark.cn-beijing.volces.com/api/v3`
- 认证与密钥管理：Bearer；钥匙串账户 `volcengine-api-key`；控制台 <https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey>。
- 模型列表：不提供；模型 ID 通常是部署端点（`ep-...`），需从方舟控制台复制后手动添加。
- 已知怪癖：思考用 `thinking.type`，三态 `disabled` / `auto` / `enabled`。
- 降级方案：无可靠公开列表，统一手动填写部署端点 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 硅基流动 SiliconFlow（`siliconflow`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://api.siliconflow.cn/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `siliconflow-api-key`；控制台 <https://cloud.siliconflow.cn/account/ak>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：未发现（未独立核实）`?`。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### MiniMax（`minimax`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://api.minimax.chat/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `minimax-api-key`；控制台 <https://platform.minimaxi.com/user-center/basic-information/interface-key>。
- 模型列表：不提供；模型 ID 需手动填写。
- 已知怪癖：未发现（未独立核实）`?`。
- 降级方案：探测 404 按正常处理，模型由用户手动添加。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 阶跃星辰 StepFun（`stepfun`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://api.stepfun.com/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `stepfun-api-key`；控制台 <https://platform.stepfun.com/interface-key>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：未发现（未独立核实）`?`。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 腾讯混元（`hunyuan`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://api.hunyuan.cloud.tencent.com/v1`
- 认证与密钥管理：Bearer；钥匙串账户 `hunyuan-api-key`；控制台 <https://console.cloud.tencent.com/hunyuan/api-key>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：未发现（未独立核实）`?`。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 百度千帆（`qianfan`）

- 用途：OpenAI 兼容聊天补全。
- 端点：`https://qianfan.baidubce.com/v2`
- 认证与密钥管理：Bearer；钥匙串账户 `qianfan-api-key`；控制台 <https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application>。
- 模型列表：`GET /models` → `data[].id`。
- 已知怪癖：未发现（未独立核实）`?`。
- 降级方案：列表拉取失败时手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。

### 自定义 / 本地 OpenAI 兼容（`custom`）

- 用途：接入任意 OpenAI 兼容服务或本地推理服务。
- 端点：空，由用户填写；支持回环与私网地址。
- 认证与密钥管理：Bearer，可选；钥匙串账户 `custom-api-key`；无密钥时请求不带鉴权头。
- 模型列表：取决于所填服务；默认按 `GET /models` → `data[].id` 解析。
- 已知怪癖：未配置端点时探测直接报「端点为空」，不发请求。
- 降级方案：关掉模型列表探测，手动填写模型 ID。
- 对接的功能：[features/AI模型配置.md](features/AI模型配置.md)
- 变更记录：2026-11-25 首次登记（取自内置目录，未独立核实）。