# 大模型 Provider 配置的数据驱动设计与请求参数合并

- 首次记录：2026-11-17
- 适用场景：需要接入多家大模型厂商的客户端（AI 聊天应用、IDE 插件、Agent 工具、带 AI 能力的桌面/终端软件）
- 关键词：大模型配置、Provider、请求体参数、思考强度档位、配置收敛、密钥管理、多厂商适配
- 解决什么问题：让"接入一家新厂商"和"让用户调高级请求参数"都变成纯配置变更，同时配置文件被手工改坏时应用不崩溃、密钥不落盘
- 前置知识：知道大模型 API 的基本请求形态（JSON 请求体、鉴权头、模型 ID）即可，不需要了解任何具体项目

## 1. 问题与目标

多厂商接入最容易写成硬编码：每加一家厂商就加一层 if，用户想调一个厂商专属参数（惩罚系数、采样参数、厂商自定义的思考/推理参数）就要改代码。各厂商的"思考强度"参数尤其碎——参数名不同、取值类型不同、有的还是嵌套对象，有的厂商不接受某个取值、只能靠**省略参数**表达"关闭思考"。同时配置文件通常允许用户手工编辑，改坏一部分是常态。

目标：

1. 新增一家厂商 = 一次纯配置变更；代码里只有少量"传输协议适配器"，新增厂商不改代码。
2. 用户可以在设置界面给任意厂商/模型添加自定义请求体参数，含嵌套键。
3. "思考强度"滑条跨厂商可用，且支持"关闭档 = 参数整个不发"。
4. 手工改坏的配置文件永不导致崩溃；损坏部分丢弃并给出人话 warning，其余照常加载。
5. 配置文件里永远没有密钥；密钥只存操作系统凭据库。

硬约束：请求体合并逻辑必须是纯函数（UI 预览与真正发请求共用同一份实现）；用户配置不得劫持对话载体（`messages`、`model`、`stream`、`tools` 这类传输独占键）。

## 2. 规则定义

### 2.1 身份与命名

| 规则 | 内容 | 理由 |
|---|---|---|
| 稳定 ID 与显示名分离 | `id` 是配置查找/模型归属/引用迁移的主键，`label` 随便改 | 显示名进主键后，用户改个名字引用全断 |
| `id` 唯一且非空 | 空值、重名拒绝保存；加载时重复 ID 丢弃后者并记 warning | 主键语义 |
| 改名只改 `id` | 模型列表、参数、凭据账户名原样保留；指向旧 ID 的引用（偏好、快捷方式）改写到新 ID | 改名是重命名，不是重建 |
| 凭据账户名派生自 `id` 但独立存储 | 新建时缺省为 `<id>-api-key` 一类派生名；改名不跟随 | 凭据在系统凭据库里按账户名存取，跟随改名会丢失密钥 |

### 2.2 层级继承

| 字段 | 层级链 | 缺省行为 |
|---|---|---|
| 系统提示词档位 | 全局 → 厂商 → 模型 | 该层未声明即继承上一层 |
| 自定义请求体参数 | 厂商 → 模型 | 模型未声明不继承厂商的（参数是列表，见 2.3 合并规则） |
| 思考强度阶梯 | 厂商 → 模型 | 模型未声明用厂商的兜底阶梯 |

核心约定：**"缺省 = 继承上一层"，不为字段写兜底默认值**。写了默认值，用户就无法区分"我设过"和"没设过"，继承链也就失效。

### 2.3 请求体合并顺序（判定矩阵，按序执行）

设请求体从空 `{}` 开始，`null` 值统一表示"从请求体删除该键"，点号键名（如 `provider_options.truncate`）表示嵌套路径：

| 步 | 来源 | 规则 | 冲突处理 | 理由 |
|---|---|---|---|---|
| 1 | 厂商级静态参数 | 逐条写入：`enabled=false` 或值为 `null` 的条目跳过 | — | 厂商级共享参数是底座 |
| 2 | 模型级静态参数 | 逐条写入 | **同键整体替换**厂商级的该条定义（值、启用状态一起换） | 模型级要么全用厂商默认、要么全接管该参数；半接管语义混乱 |
| 3 | 当前思考档位 | 把档位取值写入阶梯配置的 `path` 指向的键；档位取值为 `null` 时删除该键 | — | 见 2.4 分工 |
| 4 | 模型级原始 `extra` | 逐键合入：两侧都是对象时深合并，标量/数组直接覆盖；值为 `null` 时删除该键 | — | 逃生口，最后发言权 |
| 5 | 受保护键检查 | 以上每一步，键名首段落在受保护集合（`messages`、`model`、`stream`、`tools`、`tool_choice`、`input` 等**传输独占键**）时跳过，并记 warning | — | 用户配置不得劫持对话载体 |

补充规则：

- 值解析：配置里的参数值先按 JSON 解析（支持对象/数组），解析失败再当普通字符串——用户写 `0.5` 和写 `"0.5"` 都能用，但语义不同要在 UI 上讲清楚。
- 禁止被静态参数覆盖 transport 键、但允许厂商配置里的鉴权方式（`bearer` / `x-api-key` 自定义头名 / 匿名）作为**独立字段**存在，不混进请求体参数。
- 静态请求头是独立配置（非密钥静态头），不走请求体参数通道。

### 2.4 静态参数与思考档位的分工（硬性规则）

| 维度 | 静态参数 | 思考强度档位 |
|---|---|---|
| 语义 | 每次请求都携带、取值固定 | 同一个参数名（`path`）下按档位取值 |
| 数据形态 | 键 → 值 + 启用开关 | 一个参数名 + 有序档位列表（每档 id、标签、取值；最左档即"关闭"） |
| "关闭思考" | 不适用 | 该档取值为 `null`，即整个参数不发 |
| 混用后果 | 档位塞进静态参数：滑条无法映射、迁移无据 | — |

已知取舍：一个阶梯只能表达**一个参数名**。个别厂商的思考控制是"布尔开关 + token 预算"双参数联动，单阶梯表达不了——内置模板退化为布尔开关两档，或等待该字段升级为"每档一段原始 JSON"。升级前不要为了覆盖特例把主模型复杂化。

### 2.5 加载收敛规则（配置从磁盘读入时）

把"任意 JSON"收敛为合法配置，**只丢弃、不抛错，逐条记 warning**：

| 输入情形 | 结果 | 理由 |
|---|---|---|
| 整个文件不是对象 / 缺少厂商列表字段 | 返回空配置 + warning | 半个坏文件不该拖垮整个功能 |
| 厂商/模型条目缺 `id` | 丢弃该条目 + warning | 无法定位就无法加载 |
| 厂商/模型 `id` 重复 | 忽略后者 + warning | 主键冲突 |
| 字段类型非法（数字写成字符串、档位数组缺失等） | 丢弃该字段，恢复"缺省 = 继承"语义 | 局部损坏不扩散 |
| 静态头中出现密钥类头名（`authorization`、`api-key` 等） | 剔除该头 + warning："密钥属于系统凭据库" | 防止密钥被明文写进可同步/可备份的文件 |
| 旧版思考配置的各档位恰好共用一个参数键 | 无损迁移为新格式 | 有唯一正确映射时自动迁 |
| 旧版思考配置引用了多个参数键 | 丢弃 + warning 提示在设置页重新配置 | 无损迁移不存在时，宁可让用户重配也不猜 |
| 默认模型指向不存在的 ID | 回落到首个可用模型 | 避免空选 |

### 2.6 判定流程（合并引擎）

```text
resolve(共享配置, 模型配置, 当前档位ID) -> { 请求体, warnings[] }
  1. 合并参数定义表：先共享后模型，同键模型覆盖（整体替换）
  2. 逐条启用参数：跳过禁用/null 值 -> 受保护键检查 -> 按点号路径写入
  3. 解析档位：模型阶梯 ?? 厂商阶梯；无效档位ID回落到默认档；档位取值
     非 null 时 -> 受保护键检查 -> 写入阶梯的 path
  4. 逐键合入 extra：受保护键检查 -> null 删除 / 对象深合并 / 其余覆盖
  5. 返回请求体与全部 warning（UI 展示，传输层记录）
```

## 3. 实现思路

数据结构两层：厂商条目（协议类型、接口地址、鉴权方式、凭据账户名、静态头、共享参数、兜底阶梯、模型列表）与模型条目（模型 ID、上下文/输出上限、参数、阶梯或 null、原始 extra）。协议适配器只认"协议类型"这一个枚举，其余全部读配置。

合并引擎是纯函数：输入配置与档位，输出请求体与 warning，不碰网络、不读全局状态。UI 的"参数预览"和传输层的真实注入调用同一个函数，两边永不漂移。点号路径写入时沿途创建嵌套对象；已有对象与新值都是对象时深合并，否则覆盖。

```ts
// 自造中性命名的最小示例，不依赖任何外部符号；注释只写为什么

// 传输独占键：任何用户配置都不得覆盖
const PROTECTED_KEYS = new Set(["messages", "model", "stream", "tools", "tool_choice", "input"]);

type Param = { key: string; value: unknown; enabled: boolean };
type Ladder = { path: string; levels: { id: string; value: unknown }[] };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parentAt(body: Record<string, unknown>, path: string): Record<string, unknown> {
  const parts = path.split(".").filter(Boolean);
  let cur = body;
  for (const p of parts.slice(0, -1)) {
    if (!isObj(cur[p])) cur[p] = {}; // 沿途非对象节点强制重建，避免写进标量
    cur = cur[p] as Record<string, unknown>;
  }
  return cur;
}

// 点号路径写入；null 删除叶子
function setAtPath(body: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  const cur = parentAt(body, path);
  const leaf = parts[parts.length - 1];
  if (value === null) delete cur[leaf]; else cur[leaf] = value;
}

function apply(body: Record<string, unknown>, key: string, value: unknown, warns: string[], src: string): void {
  if (PROTECTED_KEYS.has(key.split(".")[0])) {
    warns.push(`"${key}" is transport-owned, skipped (${src})`);
    return;
  }
  setAtPath(body, key, value);
}

// 共享参数与模型参数先合成定义表：同键整体替换（后写全量覆盖，不做字段级合并）
function mergeDefs(shared: Param[], model: Param[]): Param[] {
  const byKey = new Map<string, Param>();
  for (const p of shared) byKey.set(p.key, p);
  for (const p of model) byKey.set(p.key, p);
  return [...byKey.values()];
}

export function resolveRequestBody(
  shared: { params: Param[]; ladder: Ladder | null },
  model: { params: Param[]; ladder: Ladder | null; extra: Record<string, unknown> },
  levelId?: string | null,
): { body: Record<string, unknown>; warnings: string[] } {
  const body: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const p of mergeDefs(shared.params, model.params)) {
    if (!p.enabled || p.value === null) continue;
    apply(body, p.key, p.value, warnings, `param "${p.key}"`);
  }

  const ladder = model.ladder ?? shared.ladder;          // 模型优先，厂商兜底
  const level = ladder?.levels.find(l => l.id === levelId)
    ?? ladder?.levels[0];                                // 无效档位回落到最左（关闭）
  if (ladder && level && level.value !== null) {
    apply(body, ladder.path, level.value, warnings, `level "${level.id}"`);
  }

  for (const [key, value] of Object.entries(model.extra)) {
    if (PROTECTED_KEYS.has(key.split(".")[0])) {
      warnings.push(`extra "${key}" is transport-owned, skipped`);
      continue;
    }
    if (value === null) { setAtPath(body, key, null); continue; }
    mergeAtPath(body, key, value);
  }
  return { body, warnings };
}

// 逃生口合入：两侧都是对象时深合并保留兄弟键，标量/数组直接覆盖
function mergeAtPath(body: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  const cur = parentAt(body, path);
  const leaf = parts[parts.length - 1];
  const prev = cur[leaf];
  cur[leaf] = isObj(prev) && isObj(value) ? deepMerge(prev, value) : value;
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isObj(out[k]) && isObj(v) ? deepMerge(out[k] as Record<string, unknown>, v) : v;
  }
  return out;
}
```

加载收敛器与合并引擎分离：收敛器把磁盘上的任意 JSON 变成合法配置对象（规则见 2.5），合并引擎只吃合法对象。两者都应是纯函数，逐条给正例/反例单测。

## 4. 逐步示例

配置：厂商共享参数 `temperature=0.7`、`frequency_penalty=0.5`；模型参数 `temperature=0.2`、`top_p=0.9`；阶梯 `path="reasoning_effort"`，档位 `off(null) / mid("medium") / high("high")`，当前档 `high`；模型 `extra = { "provider_options": { "truncate": true }, "stream": false }`。

| 步 | 操作 | 请求体结果 | 依据规则 |
|---|---|---|---|
| 1 | 应用共享参数 | `{temperature: 0.7, frequency_penalty: 0.5}` | 2.3 步 1 |
| 2 | 应用模型参数 | `temperature` 变 `0.2`，新增 `top_p: 0.9`；`frequency_penalty` 不动 | 2.3 步 2，同键整体替换 |
| 3 | 应用当前档位 `high` | 新增 `reasoning_effort: "high"` | 2.3 步 3 |
| 4 | 合入 `extra` | 新增嵌套对象 `provider_options: {truncate: true}` | 2.3 步 4，对象深合并 |
| 5 | `extra` 里的 `stream` | 不进请求体；warning `"stream" is transport-owned` | 2.3 步 5，受保护键 |
| 6 | 用户把当前档切到 `off` | `reasoning_effort` 从请求体**消失**（整键不发） | 2.3 步 3，null = 删除 |
| 7 | 用户禁用 `top_p`（enabled=false） | `top_p` 不出现在请求体 | 2.3 步 1/2，禁用跳过 |

加载收敛示例：手工编辑后文件里某模型 `inputTokens` 写成 `"128k"`（字符串）→ 该字段丢弃、恢复默认值，warning 一条；同文件里另一厂商缺 `id` → 整个厂商条目丢弃；其余厂商照常加载。

## 5. 为什么有效

- **数据驱动 + 少量协议适配器**：厂商差异（思考参数名、取值形态、鉴权头、模型列表端点）全部变成配置字段，代码只在出现真正新的线上协议时才动。这是"新增厂商不改代码"的前提；若厂商差异大到协议层（如流式分帧完全不同），适配器枚举就得扩，这是该方案让渡的边界。
- **纯函数合并引擎**：UI 预览与真实请求共用一份实现，"设置页看到的"和"实际发出去的"永不漂移；且可脱离运行时离线单测。
- **缺省即继承**：不为字段造兜底默认值，层级链（全局 → 厂商 → 模型）才能既省配置又保留逐层覆盖能力。
- **丢弃 + warning 的收敛策略**：手工编辑是常态场景，"部分损坏 → 整体瘫痪"比"部分丢失 + 明确提示"代价大得多；warning 必须是人话并指向修复路径。
- **受保护键 + 密钥外置**：把"用户能配什么"的边界画在传输载体与凭据两处，配置系统的自由度才敢放开到"任意键值"。

前提被换掉会失效：思考控制若需要多参数联动（开关 + 预算），单路径阶梯表达不了，需要升级为每档原始 JSON；若产品不允许用户自定义请求体（纯托管服务），2.3/2.4 可整体裁掉，保留收敛与继承即可。

## 6. 常见误区

| 误区 | 后果 | 正确做法 |
|---|---|---|
| 思考档位做成 N 条静态参数 + 开关切换 | 滑条无法映射，旧配置无法自动迁移 | 单参数名 + 每档取值的阶梯模型 |
| 用户参数直接整体覆盖进请求体（`Object.assign`） | 可劫持 `messages`/`tools`，甚至关掉流式 | 受保护键集合 + 每次写入前检查并记 warning |
| 加载配置遇到非法值抛异常 | 一个坏字段让整个 AI 功能瘫痪 | 只丢弃不抛错，逐条人话 warning |
| 用显示名当主键 | 用户改名后引用、偏好、凭据全断 | 稳定 ID 与显示名分离；改名只改 ID 并迁移引用 |
| 密钥写进配置文件"方便点" | 文件会被备份/同步/提交，明文泄漏 | 密钥只进系统凭据库；加载时发现密钥类头直接剔除并警告 |
| 模型级同名参数做字段级合并 | 布尔与对象混排、语义不可预测 | 同键整体替换；只在"原始 extra 逃生口"做对象深合并 |
| 旧配置无法无损迁移时硬猜一个映射 | 静默产生错误行为，比缺配置更糟 | 丢弃 + warning + 指向重新配置入口 |
| 默认档位写死在代码里 | 换厂商即硬编码回归 | 默认档来自配置（声明了合法默认用之，否则最左档） |

## 7. 迁移到其他产品形态

| 形态 | 不变 | 必须改 |
|---|---|---|
| 通用 AI 聊天客户端 | 全套：继承链、合并引擎、收敛规则、密钥规则 | 受保护键集合按目标 API 盘点 |
| IDE / 编辑器插件 | 合并引擎、收敛规则 | 补全场景可能要为低延迟单独走一条精简配置链 |
| Agent 框架（含工具调用） | 全套 | `tools`/`tool_choice` 必须在受保护集；跨轮保留推理内容的标记建议做成模型自由标签 |
| 服务端网关 | 合并引擎、收敛规则 | 密钥规则换成服务端 secret store；继承链最上层从"全局"换成"租户/工作区" |

改动清单：① 受保护键集合按目标线上协议实际字段逐个盘点（这是安全边界，宁多勿少）；② 协议适配器数量按目标协议族；③ 旧配置迁移的触发方式（版本字段显式迁移 vs 读取时探测式迁移，二选一定死）；④ 密钥存储介质按平台能力（凭据库 / secret store）。

## 8. 验证清单

合并引擎（纯函数，逐条正例/反例/边界）：

1. 三层来源逐层叠加：共享参数、模型同名整体替换、extra 覆盖，逐步对照 2.3 断言请求体。
2. 受保护键从三个来源（静态参数、档位、extra）都写不进去，且各产生一条 warning。
3. `off` 档（null）发出后请求体不含该键；无效档位 ID 回落到默认档；未声明阶梯时用厂商兜底；双方都未声明时不发任何档位键。
4. 点号路径创建嵌套对象；extra 与已有对象深合并不丢兄弟键；标量覆盖对象、对象覆盖标量按 2.3 步 4 断言。
5. 禁用参数（enabled=false）与 null 值参数均不进请求体。

收敛器（喂损坏 JSON）：

6. 非对象文件、缺厂商列表 → 空配置 + 对应 warning，不抛异常。
7. 缺 ID、重复 ID、字段类型非法、密钥类静态头 → 各自的丢弃/剔除与 warning 文本。
8. 旧格式：共用单键的旧思考配置无损迁移（迁移后请求结果与迁移前一致）；多键旧配置丢弃 + 提示重配。

身份与凭据：

9. ID 改名后：模型列表、参数、凭据账户不变；指向旧 ID 的引用改写到新 ID；空值/重名被拒绝。

## 9. 变更记录

- 2026-11-17 首次整理：从一次多厂商接入实现中提炼层级继承、请求体合并判定矩阵、思考档位分工、加载收敛规则与密钥边界。
