import type { settingsModels } from "../../en/settings/models";

/** 设置窗口 · Models 区块（含 models/StructuredFields 表单）。 */
export const settingsModelsZh: typeof settingsModels = {
  header: {
    title: "模型",
    description:
      "Provider 和模型都是数据驱动的。可以在这里编辑，也可以直接改下方的 JSON 文件——两处写的是同一份配置。API Key 保存在操作系统钥匙串中。",
  },
  loading: "加载中…",
  configFile: {
    label: "配置文件",
    info: "Provider、模型、自定义请求参数与思考强度档位都保存在这个文件里。可以直接用编辑器修改，但修改后需要重新加载才会生效。",
    reload: "从磁盘重新加载",
    reloadInfo:
      "从磁盘重新读取 JSON。设置页里尚未保存的修改会被丢弃；如果文件刚被外部编辑过，必须先点这里才能看到新配置。",
    open: "在系统中打开",
    openInfo:
      "优先使用已注册或已安装的第三方文件管理器（如 Total Commander、Directory Opus、One Commander），没有检测到时使用系统资源管理器打开 terax-ai-models.json 所在目录。",
    openFailed: "无法打开目录：{{error}}",
  },
  providers: {
    label: "Provider",
    add: "添加 Provider",
    domesticGroup: "国内厂商",
    custom: "自定义 Provider",
    emptyTitle: "还没有配置 Provider。",
    emptyHint: "点击“添加 Provider”接入国内模型厂商或自定义 OpenAI 兼容端点。",
  },
  provider: {
    configured: "已配置",
    console: "控制台",
    remove: "移除 Provider",
    baseUrl: {
      label: "Base URL",
      info: "厂商 OpenAI 兼容接口的根地址，通常以 /v1 或 /v4 结尾。地址错误会导致 Test 失败或请求 404。",
    },
    test: "测试",
    testInfo:
      "请求 /models 验证地址、网络与鉴权。401/403 表示 Key 有问题；404 表示端点可达但厂商不提供模型列表。",
    apiKey: {
      label: "API Key",
      info: "只保存到操作系统钥匙串，不会写入 JSON 文件。端点不需要鉴权时可以留空。",
      placeholderRequired: "粘贴厂商 API Key",
      placeholderOptional: "无需鉴权的端点可留空",
      remove: "移除 Key",
      save: "保存",
    },
    fetchModels: "获取模型列表",
    fetchModelsInfo:
      "调用厂商的模型列表接口，把返回的模型 ID 列出来供你逐个添加。没有列表接口的厂商请手动填写模型 ID。",
    noModelsApi: "该厂商未配置模型列表接口 — 请手动添加模型",
    fetchedLabel: "拉取到的模型",
    fetchedCount_one: "发现 {{count}} 个模型，点击下方条目添加。",
    fetchedCount_other: "发现 {{count}} 个模型，点击下方条目添加。",
    dismiss: "关闭",
    added: "已添加",
    add: "添加",
    modelsLabel: "模型（{{count}}）",
    modelsInfo:
      "这里列出该 Provider 下可选择的模型。每个模型都需要单独填写 ID、输入/输出 token 上限与参数配置。",
    addModel: "添加模型",
    noModelsYet:
      "暂无模型。可点击 “获取模型列表” 从厂商拉取，或手动添加模型 ID。",
    advancedToggle: "高级：Params 参数 / 思考强度 / 模型列表接口",
    advancedInfo:
      "展开 Provider 级的高级配置：传输协议、鉴权方式、钥匙串账户、静态请求头、共享 Params 参数、兜底思考强度档位与模型列表接口。",
    testing: "测试中…",
  },
  modelRow: {
    levels_one: "思考强度 {{count}} 档",
    levels_other: "思考强度 {{count}} 档",
    edit: "编辑模型",
    remove: "移除模型",
  },
  modelEditor: {
    newTitle: "新建模型",
    editTitle: "编辑模型",
    errorIdRequired: "模型 ID 不能为空。",
    errorInput: "输入 token 必须是 ≥ 1000 的数字。",
    errorOutput: "输出 token 必须是正数。",
    errorParamsJson: "参数 JSON 无效：{{error}}",
    errorEffortJson: "思考强度 JSON 无效：{{error}}",
    errorExtraJson: "额外 JSON 无效：{{error}}",
    duplicateId: "模型 ID 已存在：{{id}}",
    modelId: {
      label: "Model ID",
      info: "厂商 API 使用的真实模型 ID（如 glm-5.3 / deepseek-chat）。必须与厂商文档完全一致，否则请求会失败；整个配置内不能与其他模型重复。",
    },
    label: {
      label: "Label",
      info: "仅用于界面显示，不会发送给厂商。建议填写能一眼区分的名称。",
      placeholder: "显示名",
    },
    input: {
      label: "Input",
      info: "上下文窗口（输入 token 预算）。设得过大会让超长请求被厂商拒绝；过小会触发上下文压缩、丢失早期对话。",
      unit: "tokens（上下文窗口）",
    },
    output: {
      label: "Output",
      info: "单次响应的最大输出 token，会作为 max_tokens 发送。过小会截断回答；过大会被部分厂商拒绝或增加费用。",
      unit: "tokens（单次响应）",
    },
    sampling: {
      label: "Sampling",
      info: "控制采样行为、补全可用性与系统提示词长度。修改前请确认模型是否支持 temperature。",
      temperatureInfo:
        "开启后会按调用方传入的 temperature 采样；推理模型通常应关闭，否则请求可能被拒绝。",
      autocompleteInfo:
        "关闭后该模型不会出现在编辑器的行内补全选择器中；云端旗舰模型通常不适合做补全。",
      promptInfo:
        "该模型使用的基础系统提示词。“跟随上级”取 Provider 的设置（Provider 也未设置时取全局默认）；full 使用完整提示词（工具规范、路径规则等）；lite 更短、更省 token，适合小模型；“自定义提示词”使用「AI 行为 → 系统提示词管理」中编写的文本。",
      promptInherit: "跟随上级",
      promptCustom: "自定义提示词",
    },
    tags: {
      label: "Tags",
      info: "逗号分隔的标记。reasoning 表示跨工具调用轮次保留推理内容（推理模型通常需要）；lite 仅作标记，系统提示词长度由 Sampling 右侧的 full/lite 决定。",
    },
    params: {
      label: "Params（自定义请求参数）",
      info: "每次请求都会携带的自定义请求体参数，例如 frequency_penalty 等高级采样参数。想设置思考强度请改用下方的 Effort 字段。",
    },
    effort: {
      label: "Effort（思考强度）",
      info: "控制 Ctrl+I 模型选择窗底部的思考强度滑条。所有档位共用一个请求体参数名（path），每个档位只填写自己的取值；取值为 null 表示省略该参数（关闭思考）。",
    },
    extra: {
      label: "Extra（原始覆盖）",
      info: "最后合并进请求体的原始 JSON，用于厂商专有字段。优先级最高，但 model、messages、stream、tools 等传输键会被忽略。",
    },
    cancel: "取消",
    close: "关闭编辑器",
    create: "添加模型",
    creating: "添加中…",
  },
  advanced: {
    id: {
      label: "ID",
      info: "Provider 的稳定标识，用于配置查找、模型归属和自动补全引用；不参与请求。修改后自动补全中的旧引用会同步到新 ID，钥匙串账户与已有 API Key 保持不变。ID 不能为空且不能与其他 Provider 重复。",
    },
    idRequired: "Provider ID 不能为空。",
    idDuplicate: "Provider ID “{{id}}” 已被使用。",
    idUnknown: "找不到要修改的 Provider。",
    label: {
      label: "Label",
      info: "Provider 在设置页与模型选择窗中的显示名；不参与请求。",
    },
    protocol: {
      label: "Protocol",
      info: "传输协议。国内厂商几乎都使用 openai-compatible；切换协议不会删除已有模型或密钥，但请求格式会随之改变。",
      openaiCompatible: "openai-compatible（国内厂商通用）",
    },
    auth: {
      label: "Auth",
      info: "鉴权方式：bearer 发送 Authorization: Bearer <key>；x-api-key 发送自定义头；none 表示不发送密钥（本地或匿名网关）。required 关闭后允许不填 Key 调用。",
    },
    keyring: {
      label: "Keyring",
      info: "操作系统钥匙串中的账户名。这里只存名字，不存密钥；修改后需要重新保存该 Provider 的 API Key。",
    },
    console: {
      label: "Console",
      info: "厂商控制台链接，仅用于卡片右上角的跳转；留空则不显示链接。",
    },
    icon: {
      label: "Icon",
      info: "图标键：brain / cpu / globe / flash / server / plug。未知值会回退为插头图标。",
    },
    systemPrompt: {
      label: "提示词",
      info: "该 Provider 下所有模型使用的基础提示词档位；模型在 Sampling 里单独选择时会覆盖此项。“跟随全局默认”使用「AI 行为 → 系统提示词管理」里的默认提示词。",
      inherit: "跟随全局默认",
      custom: "自定义提示词",
    },
    params: {
      label: "Params（Provider 共享参数）",
      info: "该 Provider 下所有模型共享的自定义请求体参数；模型重新声明同一 key 时会覆盖这里的定义。想设置思考强度请改用下方的 Effort 字段。",
    },
    effort: {
      label: "Effort（Provider 兜底档位）",
      info: "模型没有声明自己的思考强度档位时使用这里的档位。null 表示默认不显示思考强度滑条；档位在“表单”模式下配置。",
    },
    headers: {
      label: "Headers（静态请求头）",
      info: "每次请求都会附带的固定请求头。不要在这里放 API Key（会被自动移除并告警）；适合 HTTP-Referer、X-Title 等非密钥头。",
    },
    modelsApi: {
      label: "Models API（模型列表接口）",
      info: "描述厂商的模型列表接口。关闭（null）后该 Provider 只能手动添加模型；path 是接口路径，itemsPath 是响应中数组的位置，idPath 是数组中模型 ID 的字段。",
    },
    errorJson: "JSON 无效：{{error}}",
  },
  autosave: {
    hint: "修改会自动保存",
    saving: "保存中…",
    saved: "已保存",
    failed: "自动保存失败",
    savedOnLeave: "模型配置已自动保存",
    failedOnLeave: "部分模型配置未保存，请返回模型设置检查填写内容",
  },
  defaults: {
    label: "默认",
    chatModel: {
      label: "聊天模型",
      info: "新会话默认使用的模型。删除该模型后会自动回退到配置中的第一个可用模型。",
      noModels: "未配置模型",
      selectModel: "选择模型",
    },
    autocomplete: {
      label: "自动补全",
      info: "编辑器行内补全使用的模型与触发方式。建议选择低延迟、便宜的模型；关闭后不会发起任何补全请求。",
      providerPlaceholder: "Provider",
      modelPlaceholder: "模型",
    },
    trigger: {
      label: "触发方式",
      info: "Automatic：输入时自动请求补全，可能增加延迟与费用；Manual：只在快捷键触发时请求。",
      auto: "自动（输入时）",
      manual: "手动（快捷键）",
    },
  },
  validation: {
    paramKeyRequired:
      "Params 第 {{index}} 项的 Key 不能为空（没有 Key 的参数会被丢弃）。",
    effortNeedsPath: "Effort 需要填写请求体参数名（path）。",
    effortNeedsLevel:
      "Effort 至少需要一个档位，或者设为 null 表示不显示滑块。",
    effortLevelMissingId: "Effort 第 {{index}} 个档位缺少 ID。",
    effortLevelDuplicateId: "Effort 档位 ID 重复：{{id}}。",
  },
  structured: {
    infoAria: "查看说明",
    modeForm: "表单",
    cannotConvert: "当前 JSON 无法转换为表单，请切回 JSON 模式修正。",
    switchError: "无法切换到表单：当前 JSON 解析失败（{{error}}）",
    parseParamsArray: "Params 必须是数组，例如 []。",
    parseParamsItems: "Params 数组中的每一项都必须是对象。",
    parseThinking: "Effort 必须是 null，或包含 path 与 levels 数组的对象。",
    parseExtra: "Extra 必须是一个 JSON 对象，例如 {}。",
    parseHeaders: "Headers 必须是一个 JSON 对象，例如 {}。",
    headerValueString: '请求头 "{{key}}" 的值必须是字符串。',
    parseModelsApi:
      "Models API 必须是 null，或包含 path / itemsPath / idPath 的对象。",
    noKeyValues: "还没有键值对。",
    removeRow: "删除这一行",
    paramsEmpty:
      "未声明自定义参数。大多数 OpenAI 兼容厂商可以留空。规则：想自定义请求体参数（如 frequency_penalty）在这里添加；想设置思考强度请改用下方的 Effort 字段。",
    paramTitle: "参数 #{{index}}",
    paramEnabled: "启用",
    paramRemove: "删除该参数",
    paramKey: "Key（请求体参数名）",
    paramKeyInfo:
      "实际写入请求体的键名，点号会创建嵌套对象。想按档位调节思考强度请改用 Effort 字段。",
    paramLabel: "显示名（可选）",
    paramLabelPlaceholder: "频率惩罚",
    paramValue: "取值",
    paramValueInfo:
      "每次请求都原样发送。支持 high、1024、true 或完整 JSON；写 null 表示省略该键。",
    paramValuePlaceholder: "high / 1024 / true / {\"a\":1}",
    paramDescription: "说明（可选）",
    paramDescriptionPlaceholder: "给未来的自己留一句说明",
    addParam: "添加参数",
    paramsRule: "规则：自定义请求体参数用 Params；思考强度用 Effort。",
    paramsRuleHint:
      "Params 定义每次请求都携带的静态请求体参数（如 frequency_penalty、top_p）。想按档位调节思考强度时，不要在这里堆思考参数——请在 Effort 字段中配置。",
    effortNull: "当前为 null：该模型不会显示思考强度滑块，也不会发送思考强度参数。",
    effortCreate: "创建思考强度档位",
    effortPath: "参数名（path）",
    effortPathInfo:
      "承载思考强度取值的请求体键名，例如 reasoning_effort 或 thinking.type。点号会创建嵌套对象。",
    effortDefault: "默认档位",
    effortDefaultInfo:
      "用户没有手动选择时使用该档位；删除默认档位后会回退到第一档。",
    effortDefaultPlaceholder: "选择默认档位",
    effortOffLabel: "最左档位标签",
    effortOffLabelInfo: "滑条最左端的文字，一般为“关闭”。",
    effortOffSeed: "关闭",
    effortRule: "规则：思考强度用 Effort；其他自定义请求体参数用 Params。",
    effortRuleHint:
      "Effort 只负责思考强度：所有档位共用 path 里设置的参数名，每个档位只需填写自己的取值；取值为 null 表示省略该参数（关闭思考）。其他自定义参数请用 Params。",
    levelTitle: "档位 #{{index}}",
    levelLeftmost: "（最左 / 关闭）",
    levelRemove: "删除该档位",
    levelId: "档位 ID",
    levelIdInfo:
      "档位的唯一标识：用户在滑条上选中的档位会按此 ID 记入偏好。修改已有档位的 ID 后，之前选过该档位的用户会回退到默认档位。",
    levelLabel: "显示名",
    levelLabelPlaceholder: "低 / 高 / 最高",
    levelValue: "发送取值",
    levelValueInfo:
      "该档位实际写入思考强度参数的取值。留空表示省略参数（关闭）；支持 high、1024、true 或完整 JSON。",
    levelValuePlaceholder: "high / 1024 / true；留空表示省略",
    addLevel: "添加档位",
    extraKeyPlaceholder: "键，如 stream_options",
    extraValuePlaceholder: '值，如 {"include_usage":true} / true / high',
    extraAdd: "添加额外字段",
    headerKeyPlaceholder: "头名称，如 HTTP-Referer",
    headerValuePlaceholder: "头内容",
    headerAdd: "添加请求头",
    modelsApiDisabled: "未启用模型列表接口：该 Provider 只能手动添加模型。",
    modelsApiEnable: "启用",
    apiPath: "接口路径",
    apiPathInfo: "追加到 Base URL 后的路径，通常为 /models。",
    apiItemsPath: "数组位置 itemsPath",
    apiItemsPathInfo:
      "响应 JSON 中模型数组的点路径；留空表示响应根节点就是数组。",
    apiIdPath: "模型 ID 字段 idPath",
    apiIdPathInfo: "数组中每个条目的模型 ID 字段名，通常为 id。",
    apiLabelPath: "显示名字段 labelPath",
    apiLabelPathInfo:
      "可选。数组条目中的人类可读名称字段；留空则直接使用模型 ID 作为显示名。",
    modelsApiDisable: "关闭模型列表接口",
  },
};
