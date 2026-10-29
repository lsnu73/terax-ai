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
    info: "Provider、模型、请求参数与思考档位都保存在这个文件里。可以直接用编辑器修改，但修改后需要点击 Reload from disk 才会生效。",
    reload: "从磁盘重新加载",
    reloadInfo:
      "从磁盘重新读取 JSON。设置页里尚未保存的修改会被丢弃；如果文件刚被外部编辑过，必须先点这里才能看到新配置。",
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
    advancedToggle: "高级：请求参数 / 思考档位 / 模型列表接口",
    advancedInfo:
      "展开 Provider 级的高级配置：传输协议、鉴权方式、钥匙串账户、静态请求头、共享参数、兜底思考档位与模型列表接口。",
    testing: "测试中…",
  },
  modelRow: {
    levels_one: "思考 {{count}} 档",
    levels_other: "思考 {{count}} 档",
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
    errorThinkingJson: "思考档位 JSON 无效：{{error}}",
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
        "full 使用完整系统提示词（工具规范、路径规则等）；lite 更短、更省 token，适合小模型，但会丢失部分工具使用约束。",
    },
    tags: {
      label: "Tags",
      info: "逗号分隔的标记。reasoning 表示跨工具调用轮次保留推理内容（推理模型通常需要）；lite 仅作标记，系统提示词长度由 Sampling 右侧的 full/lite 决定。",
    },
    params: {
      label: "Params（请求参数）",
      info: "声明该模型额外发送的请求参数。表单模式适合大多数情况；JSON 模式可编辑全部字段。留空（[]）表示不额外发送参数。",
    },
    thinking: {
      label: "Thinking（思考档位）",
      info: "控制 Ctrl+I 模型选择窗底部的滑条。null 表示不显示滑条；每个档位把参数 key 映射到逻辑值，值为 null 表示该档位省略此参数。",
    },
    extra: {
      label: "Extra（原始覆盖）",
      info: "最后合并进请求体的原始 JSON，用于厂商专有字段。优先级最高，但 model、messages、stream、tools 等传输键会被忽略。",
    },
    cancel: "取消",
    saving: "保存中…",
    save: "保存模型",
  },
  advanced: {
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
    params: {
      label: "Params（Provider 共享参数）",
      info: "该 Provider 下所有模型共享的参数定义；模型重新声明同一 key 时会覆盖这里的定义。留空（[]）表示不额外发送参数。",
    },
    thinking: {
      label: "Thinking（Provider 兜底档位）",
      info: "模型没有声明自己的 thinking 时使用这里的档位。null 表示默认不显示思考滑条；具体映射写法见“表单”模式或文档。",
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
    saving: "保存中…",
    save: "保存 Provider 设置",
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
    thinkingNeedsLevel:
      "Thinking 至少需要一个档位，或者设为 null 表示不显示滑块。",
    thinkingLevelMissingId: "Thinking 第 {{index}} 个档位缺少 ID。",
    thinkingLevelDuplicateId: "Thinking 档位 ID 重复：{{id}}。",
  },
  structured: {
    infoAria: "查看说明",
    modeForm: "表单",
    cannotConvert: "当前 JSON 无法转换为表单，请切回 JSON 模式修正。",
    switchError: "无法切换到表单：当前 JSON 解析失败（{{error}}）",
    parseParamsArray: "Params 必须是数组，例如 []。",
    parseParamsItems: "Params 数组中的每一项都必须是对象。",
    parseThinking: "Thinking 必须是 null，或包含 levels 数组的对象。",
    parseExtra: "Extra 必须是一个 JSON 对象，例如 {}。",
    parseHeaders: "Headers 必须是一个 JSON 对象，例如 {}。",
    headerValueString: '请求头 "{{key}}" 的值必须是字符串。',
    parseModelsApi:
      "Models API 必须是 null，或包含 path / itemsPath / idPath 的对象。",
    noKeyValues: "还没有键值对。",
    removeRow: "删除这一行",
    paramsEmpty:
      "未声明额外参数。大多数 OpenAI 兼容厂商可以留空；只有需要发送思考等级等厂商专有字段时才需要添加。",
    paramTitle: "参数 #{{index}}",
    paramEnabled: "启用",
    paramRemove: "删除该参数",
    paramKey: "Key（逻辑键）",
    paramKeyInfo:
      "思考档位通过这个键引用参数；同一 Provider 下重复声明会覆盖旧定义。",
    paramLabel: "显示名（可选）",
    paramLabelPlaceholder: "思考强度",
    paramLocation: "位置",
    paramLocationInfo: "body 写入 JSON 请求体；header 作为 HTTP 请求头发送。",
    locationBody: "body（请求体）",
    locationHeader: "header（请求头）",
    paramType: "类型",
    paramTypeInfo: "仅用于说明与校验；实际发送值仍由输入决定。",
    paramPath: "发送路径",
    paramPathInfo:
      "实际写入请求的键名。点号会创建嵌套对象，例如 thinking.type。",
    paramEnum: "可选值（逗号分隔）",
    paramEnumInfo:
      "限制该参数允许的取值；映射结果不在列表内时会被跳过并告警。留空表示不限制。",
    paramDefault: "默认值",
    paramDefaultInfo:
      "档位没有覆盖时发送该值。留空表示不设置；支持 high、1024、true 或完整 JSON。",
    paramDefaultPlaceholder: "留空 / high / 1024 / true",
    paramMap: "取值映射 map",
    paramMapInfo:
      "逻辑档位值 -> 实际发送值。值为 null 表示该档位省略此参数（用于关闭思考）。",
    paramMapKeyPlaceholder: "逻辑值，如 medium",
    paramMapValuePlaceholder: "发送值，如 high；写 null 表示省略",
    paramMapAdd: "添加映射",
    paramDescription: "说明（可选）",
    paramDescriptionPlaceholder: "给未来的自己留一句说明",
    addParam: "添加参数",
    thinkingNull: "当前为 null：该模型不会显示思考滑块，也不会发送思考参数。",
    thinkingCreate: "创建思考档位",
    thinkingOffSeed: "关闭",
    thinkingDefault: "默认档位",
    thinkingDefaultInfo:
      "用户没有手动选择时使用该档位；删除默认档位后会回退到第一档。",
    thinkingDefaultPlaceholder: "选择默认档位",
    thinkingOffLabel: "最左档位标签",
    thinkingOffLabelInfo: "滑条最左端的文字，一般为“关闭”。",
    levelTitle: "档位 #{{index}}",
    levelLeftmost: "（最左 / 关闭）",
    levelRemove: "删除该档位",
    levelId: "档位 ID",
    levelIdInfo:
      "档位的唯一标识：用户在滑条上选中的档位会按此 ID 记入偏好。修改已有档位的 ID 后，之前选过该档位的用户会回退到默认档位。",
    levelLabel: "显示名",
    levelLabelPlaceholder: "低 / 高 / 最高",
    levelValues: "档位参数值",
    levelValuesInfo:
      "参数 key -> 逻辑值。值为 null 表示该档位不发送这个参数；例如关闭思考时可发送 thinking.type=disabled 并省略 reasoning_effort。",
    levelValuesKeyPlaceholder: "参数 key",
    levelValuesValuePlaceholder: "逻辑值，如 high；null 表示省略",
    levelValuesAdd: "添加参数值",
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
