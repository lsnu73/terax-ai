/** 设置窗口 · Models 区块（含 models/StructuredFields 表单）。 */
export const settingsModels = {
  header: {
    title: "Models",
    description:
      "Providers and models are data-driven. Edit them here or in the JSON file below — both write the same configuration. API keys stay in your OS keychain.",
  },
  loading: "Loading…",
  configFile: {
    label: "Configuration file",
    info: "Providers, models, request params and thinking levels are all stored in this file. You can edit it directly, but changes only take effect after clicking Reload from disk.",
    reload: "Reload from disk",
    reloadInfo:
      "Re-reads the JSON from disk. Unsaved changes on this page are discarded; if the file was just edited externally, you must click here to see the new configuration.",
    open: "Open in file manager",
    openInfo:
      "Opens the folder containing terax-ai-models.json in your system default file manager (third-party file managers are respected).",
  },
  providers: {
    label: "Providers",
    add: "Add provider",
    domesticGroup: "Domestic providers",
    custom: "Custom provider",
    emptyTitle: "No providers configured yet.",
    emptyHint:
      'Click "Add provider" to connect a domestic model provider or a custom OpenAI-compatible endpoint.',
  },
  provider: {
    configured: "Configured",
    console: "Console",
    remove: "Remove provider",
    baseUrl: {
      label: "Base URL",
      info: "Root address of the provider's OpenAI-compatible API, usually ending in /v1 or /v4. A wrong address causes Test to fail or requests to 404.",
    },
    test: "Test",
    testInfo:
      "Requests /models to verify the address, network and auth. 401/403 means the key has a problem; 404 means the endpoint is reachable but the provider doesn't expose a model list.",
    apiKey: {
      label: "API key",
      info: "Saved only to the OS keychain, never written to the JSON file. Leave empty when the endpoint doesn't require auth.",
      placeholderRequired: "Paste the provider API key",
      placeholderOptional: "Optional for unauthenticated endpoints",
      remove: "Remove key",
      save: "Save",
    },
    fetchModels: "Fetch model list",
    fetchModelsInfo:
      "Calls the provider's model list endpoint and lists the returned model IDs for you to add one by one. For providers without a list endpoint, enter model IDs manually.",
    noModelsApi:
      "This provider has no model list endpoint — add models manually",
    fetchedLabel: "Fetched models",
    fetchedCount_one: "Found {{count}} model. Click an entry below to add it.",
    fetchedCount_other:
      "Found {{count}} models. Click an entry below to add it.",
    dismiss: "Dismiss",
    added: "Added",
    add: "Add",
    modelsLabel: "Models ({{count}})",
    modelsInfo:
      "Models available under this provider. Each model needs its own ID, input/output token limits and parameter configuration.",
    addModel: "Add model",
    noModelsYet:
      'No models yet. Click "Fetch model list" to pull from the provider, or add a model ID manually.',
    advancedToggle: "Advanced: request params / thinking levels / models API",
    advancedInfo:
      "Provider-level advanced configuration: transport protocol, auth method, keychain account, static headers, shared params, fallback thinking levels and the models list API.",
    testing: "Testing…",
  },
  modelRow: {
    levels_one: "{{count}} thinking level",
    levels_other: "{{count}} thinking levels",
    edit: "Edit model",
    remove: "Remove model",
  },
  modelEditor: {
    newTitle: "New model",
    editTitle: "Edit model",
    errorIdRequired: "Model ID is required.",
    errorInput: "Input tokens must be a number ≥ 1000.",
    errorOutput: "Output tokens must be a positive number.",
    errorParamsJson: "Invalid params JSON: {{error}}",
    errorThinkingJson: "Invalid thinking JSON: {{error}}",
    errorExtraJson: "Invalid extra JSON: {{error}}",
    duplicateId: "Model ID already exists: {{id}}",
    modelId: {
      label: "Model ID",
      info: "The real model ID used by the provider API (e.g. glm-5.3 / deepseek-chat). Must match the provider docs exactly or requests fail; must be unique across the whole configuration.",
    },
    label: {
      label: "Label",
      info: "Used only for display in the UI, never sent to the provider. Choose a name you can tell apart at a glance.",
      placeholder: "Display name",
    },
    input: {
      label: "Input",
      info: "Context window (input token budget). Too large and overlong requests get rejected by the provider; too small triggers context compression and loses earlier conversation.",
      unit: "tokens (context window)",
    },
    output: {
      label: "Output",
      info: "Maximum output tokens per response, sent as max_tokens. Too small truncates answers; too large may be rejected by some providers or increase cost.",
      unit: "tokens (per response)",
    },
    sampling: {
      label: "Sampling",
      info: "Controls sampling behavior, autocomplete availability and system prompt length. Confirm the model supports temperature before changing.",
      temperatureInfo:
        "When on, sampling uses the temperature passed by the caller; reasoning models should usually keep this off or requests may be rejected.",
      autocompleteInfo:
        "When off, this model won't appear in the editor's inline completion picker; cloud flagship models usually aren't suitable for completion.",
      promptInfo:
        'Base system prompt for this model. "Follow parent" takes the provider\'s setting (and above that, the global default); full uses the complete prompt (tool specs, path rules, etc.); lite is shorter and cheaper on tokens, suits small models; "Custom prompt" uses the text written under "AI Behavior → System prompt management".',
      promptInherit: "Follow parent",
      promptCustom: "Custom prompt",
    },
    tags: {
      label: "Tags",
      info: "Comma-separated tags. reasoning keeps reasoning content across tool-call rounds (reasoning models usually need this); lite is only a marker — system prompt length is decided by full/lite on the right of Sampling.",
    },
    params: {
      label: "Params (request params)",
      info: "Declares extra request params this model sends. Form mode suits most cases; JSON mode edits all fields. Empty ([]) sends no extra params.",
    },
    thinking: {
      label: "Thinking (levels)",
      info: "Controls the slider at the bottom of the Ctrl+I model picker. null hides the slider; each level maps param keys to logical values, and a null value omits that param at that level.",
    },
    extra: {
      label: "Extra (raw overrides)",
      info: "Raw JSON merged into the request body last, for provider-specific fields. Highest precedence, but transport keys like model, messages, stream and tools are ignored.",
    },
    cancel: "Cancel",
    saving: "Saving…",
    save: "Save model",
  },
  advanced: {
    label: {
      label: "Label",
      info: "The provider's display name in the settings page and model picker; not part of any request.",
    },
    protocol: {
      label: "Protocol",
      info: "Transport protocol. Domestic providers almost all use openai-compatible; switching protocol won't delete existing models or keys, but the request format changes accordingly.",
      openaiCompatible: "openai-compatible (common for domestic providers)",
    },
    auth: {
      label: "Auth",
      info: "Auth method: bearer sends Authorization: Bearer <key>; x-api-key sends a custom header; none sends no key (local or anonymous gateways). Turning off required allows calls without a key.",
    },
    keyring: {
      label: "Keyring",
      info: "Account name in the OS keychain. Only the name is stored here, not the secret; after changing it, re-save the provider's API key.",
    },
    console: {
      label: "Console",
      info: "Link to the provider console, used only for the jump at the card's top right; leave empty to hide the link.",
    },
    icon: {
      label: "Icon",
      info: "Icon key: brain / cpu / globe / flash / server / plug. Unknown values fall back to the plug icon.",
    },
    systemPrompt: {
      label: "Prompt",
      info: 'Base prompt kind for all models under this provider; a model picking its own kind in Sampling overrides this. "Follow global default" uses the default prompt set under "AI Behavior → System prompt management".',
      inherit: "Follow global default",
      custom: "Custom prompt",
    },
    params: {
      label: "Params (shared by provider)",
      info: "Param definitions shared by all models under this provider; a model re-declaring the same key overrides the definition here. Empty ([]) sends no extra params.",
    },
    thinking: {
      label: "Thinking (provider fallback)",
      info: "Used when a model doesn't declare its own thinking. null hides the thinking slider by default; see form mode or the docs for the mapping syntax.",
    },
    headers: {
      label: "Headers (static)",
      info: "Fixed headers attached to every request. Don't put API keys here (they're auto-removed with a warning); suited for non-secret headers like HTTP-Referer and X-Title.",
    },
    modelsApi: {
      label: "Models API (model list endpoint)",
      info: "Describes the provider's model list endpoint. Disabled (null) means models can only be added manually; path is the endpoint path, itemsPath is the array location in the response, idPath is the model ID field in array entries.",
    },
    errorJson: "Invalid JSON: {{error}}",
    saving: "Saving…",
    save: "Save provider settings",
  },
  defaults: {
    label: "Defaults",
    chatModel: {
      label: "Chat model",
      info: "Model used by default for new sessions. After deleting it, the default falls back to the first available model in the configuration.",
      noModels: "No models configured",
      selectModel: "Select model",
    },
    autocomplete: {
      label: "Autocomplete",
      info: "Model and trigger for editor inline completion. Prefer low-latency, cheap models; when off, no completion requests are made.",
      providerPlaceholder: "Provider",
      modelPlaceholder: "Model",
    },
    trigger: {
      label: "Trigger",
      info: "Automatic: requests completion as you type, may add latency and cost; Manual: only requests on the shortcut.",
      auto: "Automatic (as you type)",
      manual: "Manual (shortcut)",
    },
  },
  validation: {
    paramKeyRequired:
      "Param #{{index}} is missing a Key (params without a Key are discarded).",
    thinkingNeedsLevel:
      "Thinking needs at least one level, or set it to null to hide the slider.",
    thinkingLevelMissingId: "Thinking level #{{index}} is missing an ID.",
    thinkingLevelDuplicateId: "Duplicate thinking level ID: {{id}}.",
  },
  structured: {
    infoAria: "Show info",
    modeForm: "Form",
    cannotConvert:
      "The current JSON cannot be converted to a form; switch back to JSON mode to fix it.",
    switchError:
      "Cannot switch to form: the current JSON failed to parse ({{error}})",
    parseParamsArray: "Params must be an array, e.g. [].",
    parseParamsItems: "Every item in the Params array must be an object.",
    parseThinking: "Thinking must be null, or an object with a levels array.",
    parseExtra: "Extra must be a JSON object, e.g. {}.",
    parseHeaders: "Headers must be a JSON object, e.g. {}.",
    headerValueString: 'The value of header "{{key}}" must be a string.',
    parseModelsApi:
      "Models API must be null, or an object with path / itemsPath / idPath.",
    noKeyValues: "No key-value pairs yet.",
    removeRow: "Remove this row",
    paramsEmpty:
      "No extra params declared. Most OpenAI-compatible providers can leave this empty; only add params for provider-specific fields like thinking effort.",
    paramTitle: "Param #{{index}}",
    paramEnabled: "Enabled",
    paramRemove: "Remove this param",
    paramKey: "Key (logical key)",
    paramKeyInfo:
      "Thinking levels reference the param through this key; re-declaring it under the same provider overrides the old definition.",
    paramLabel: "Display name (optional)",
    paramLabelPlaceholder: "Reasoning effort",
    paramLocation: "Location",
    paramLocationInfo:
      "body writes into the JSON request body; header sends it as an HTTP header.",
    locationBody: "body (request body)",
    locationHeader: "header (HTTP header)",
    paramType: "Type",
    paramTypeInfo:
      "For documentation and validation only; the actual value sent is decided by input.",
    paramPath: "Send path",
    paramPathInfo:
      "The key actually written into the request. Dots create nested objects, e.g. thinking.type.",
    paramEnum: "Allowed values (comma-separated)",
    paramEnumInfo:
      "Restricts the values this param accepts; mapped results outside the list are skipped with a warning. Empty means unrestricted.",
    paramDefault: "Default value",
    paramDefaultInfo:
      "Sent when no level overrides it. Empty means unset; supports high, 1024, true or full JSON.",
    paramDefaultPlaceholder: "empty / high / 1024 / true",
    paramMap: "Value mapping (map)",
    paramMapInfo:
      "Translates a Thinking level's logical value into the actual value sent to the provider. A translated value of null omits this param at that level (used to turn off thinking).",
    paramMapKeyPlaceholder: "logical value",
    paramMapValuePlaceholder: "value sent, e.g. high; null omits",
    paramMapAdd: "Add mapping",
    paramDescription: "Note (optional)",
    paramDescriptionPlaceholder: "Leave a note for your future self",
    addParam: "Add param",
    thinkingNull:
      "Currently null: this model shows no thinking slider and sends no thinking params.",
    thinkingCreate: "Create thinking levels",
    thinkingOffSeed: "Off",
    thinkingDefault: "Default level",
    thinkingDefaultInfo:
      "Used when the user hasn't picked one manually; deleting the default level falls back to the first level.",
    thinkingDefaultPlaceholder: "Select default level",
    thinkingOffLabel: "Leftmost level label",
    thinkingOffLabelInfo: 'Text at the far left of the slider, usually "Off".',
    levelTitle: "Level #{{index}}",
    levelLeftmost: "(leftmost / off)",
    levelRemove: "Remove this level",
    levelId: "Level ID",
    levelIdInfo:
      "Unique identifier for this level: the slider choice is stored in preferences under this ID. Changing an existing level's ID invalidates previously saved selections, which fall back to the default level.",
    levelLabel: "Display name",
    levelLabelPlaceholder: "Low / High / Max",
    levelValues: "Level param values",
    levelValuesInfo:
      "Assigns each param key the logical value used at this level. A null value means this level doesn't send that param; e.g. to turn off thinking, send thinking.type=disabled and omit reasoning_effort.",
    levelValuesKeyPlaceholder: "param key",
    levelValuesValuePlaceholder: "logical value, e.g. high; null omits",
    levelValuesAdd: "Add param value",
    addLevel: "Add level",
    extraKeyPlaceholder: "e.g. stream_options",
    extraValuePlaceholder: 'value, e.g. {"include_usage":true} / true / high',
    extraAdd: "Add extra field",
    headerKeyPlaceholder: "e.g. HTTP-Referer",
    headerValuePlaceholder: "header value",
    headerAdd: "Add header",
    modelsApiDisabled:
      "Models list endpoint disabled: models can only be added manually for this provider.",
    modelsApiEnable: "Enable",
    apiPath: "Endpoint path",
    apiPathInfo: "Path appended to the Base URL, usually /models.",
    apiItemsPath: "Array location itemsPath",
    apiItemsPathInfo:
      "Dot path of the model array in the response JSON; empty means the response root is the array.",
    apiIdPath: "Model ID field idPath",
    apiIdPathInfo:
      "Field name of the model ID in each array entry, usually id.",
    apiLabelPath: "Label field labelPath",
    apiLabelPathInfo:
      "Optional. Human-readable name field in array entries; empty uses the model ID as the display name.",
    modelsApiDisable: "Disable models list endpoint",
  },
};
