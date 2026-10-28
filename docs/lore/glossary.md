# 术语 ↔ 代码实体对照

- **设置窗口 / Settings 窗口**：Tauri 的第二个 webview 窗口，label 为 `"settings"`，前端入口 `src/settings/main.tsx`（HTML 入口 `settings.html`），由 `open_settings_window` 命令创建。易与主窗口内的「设置 store」（`src/modules/settings/store.ts`，偏好存取层）混淆——前者是窗口，后者是数据层，两个 webview 都在用。
- **主窗口**：label 为 `"main"` 的 webview 窗口，前端入口 `src/main.tsx` + `src/app/App.tsx`。
- **sidecar**：随主程序分发的辅助可执行文件。本项目指 `terax-cli-<target-triple>(.exe)`，构建期由 `scripts/build-cli.mjs` 产出到 `src-tauri/binaries/`。
- **beforeBuildCommand**：`tauri.conf.json` 中 `pnpm tauri build` 正式编译前执行的命令，本项目为 `pnpm build:cli && pnpm build`。
- **terax-control-protocol**：`src-tauri/crates/terax-control-protocol/`，CLI 与主程序共用的控制协议 crate。
- **Provider**：一家模型服务商（含自建/本地 OpenAI 兼容端点）的配置条目，对应 `config/types.ts` 的 `ProviderEntry`。易与「协议 adapter」混淆——Provider 是数据，adapter 是代码。
- **模型配置（models config）**：`terax-ai-models.json` 的简称，存放 `version/defaults/providers`，是 Provider 与模型的唯一事实来源；不是 `terax-settings.json`（偏好设置）。
- **ParamDef（参数声明）**：`config/types.ts` 中描述一个请求参数的元数据（逻辑 key、body/header 位置、发送路径、类型、默认值、枚举、取值映射）。思考档位通过 `key` 引用它。
- **思考档位（thinking level）**：`ThinkingConfig.levels` 中的一项，滑块的一格；索引 0 恒为关闭。`values` 是参数 key → 逻辑值，`null` 表示该档位省略此参数。
- **取值映射（map）**：`ParamDef.map`，把逻辑档位值翻译成厂商真实取值；`null` 表示整键不发送。智谱的 `medium → high`、`xhigh → max` 都在这里表达。
- **协议 adapter（protocol）**：`agent.ts` 中按 `protocol` 枚举构造 AI SDK 模型的函数；目前有 `openai-compatible` / `anthropic` / `google`。新增国内厂商默认不需要新增 adapter。
- **钥匙串账户（keyringAccount）**：Provider 配置里唯一的密钥相关字段，只是操作系统钥匙串中的账户名，绝不包含密钥本身。
- **模型 ID 全局唯一**：当前 `ModelEntry.id` 在全配置内唯一，选择器/收藏/默认模型都以单字符串为键；同名模型需靠 `label` 区分。
