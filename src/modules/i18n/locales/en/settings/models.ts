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
    info: "Providers, models, custom request params and effort levels are all stored in this file. You can edit it directly, but changes only take effect after reloading.",
    reload: "Reload from disk",
    reloadInfo:
      "Re-reads the JSON from disk. Unsaved changes on this page are discarded; if the file was just edited externally, you must click here to see the new configuration.",
    open: "Open in file manager",
    openInfo:
      "Opens the folder containing terax-ai-models.json in a third-party file manager when one is registered or installed, and falls back to the system file manager.",
    openFailed: "Could not open the folder: {{error}}",
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
    advancedToggle: "Advanced: params / effort / models API",
    advancedInfo:
      "Provider-level advanced configuration: transport protocol, auth method, keychain account, static headers, shared params, fallback effort levels and the models list API.",
    testing: "Testing…",
  },
  modelRow: {
    levels_one: "{{count}} effort level",
    levels_other: "{{count}} effort levels",
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
    errorEffortJson: "Invalid effort JSON: {{error}}",
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
      label: "Params (custom request params)",
      info: "Extra request-body params sent with every request, e.g. frequency_penalty and other advanced sampling params. To configure reasoning-effort levels, use Effort below instead.",
    },
    effort: {
      label: "Effort (reasoning effort)",
      info: "Controls the reasoning-effort slider at the bottom of the Ctrl+I model picker. All levels share one request-body param name (path); each level only sets its own value. A null value omits the param (thinking off).",
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
      info: "Custom request-body params shared by all models under this provider; a model re-declaring the same key overrides the definition here. To configure reasoning-effort levels, use Effort below instead.",
    },
    effort: {
      label: "Effort (provider fallback)",
      info: "Used when a model doesn't declare its own effort. null hides the effort slider by default; configure the levels in form mode.",
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
    effortNeedsPath: "Effort needs a request-body param name (path).",
    effortNeedsLevel:
      "Effort needs at least one level, or set it to null to hide the slider.",
    effortLevelMissingId: "Effort level #{{index}} is missing an ID.",
    effortLevelDuplicateId: "Duplicate effort level ID: {{id}}.",
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
    parseThinking: "Effort must be null, or an object with a path and a levels array.",
    parseExtra: "Extra must be a JSON object, e.g. {}.",
    parseHeaders: "Headers must be a JSON object, e.g. {}.",
    headerValueString: 'The value of header "{{key}}" must be a string.',
    parseModelsApi:
      "Models API must be null, or an object with path / itemsPath / idPath.",
    noKeyValues: "No key-value pairs yet.",
    removeRow: "Remove this row",
    paramsEmpty:
      "No custom params declared. Most OpenAI-compatible providers can leave this empty. Rule: custom request-body params (e.g. frequency_penalty) go here; reasoning-effort levels go in the Effort field instead.",
    paramTitle: "Param #{{index}}",
    paramEnabled: "Enabled",
    paramRemove: "Remove this param",
    paramKey: "Key (request-body name)",
    paramKeyInfo:
      "The key actually written into the request body. Dots create nested objects. To adjust reasoning effort by level, use the Effort field instead.",
    paramLabel: "Display name (optional)",
    paramLabelPlaceholder: "Frequency penalty",
    paramValue: "Value",
    paramValueInfo:
      "Sent with every request as-is. Supports high, 1024, true or full JSON; write null to omit this key.",
    paramValuePlaceholder: 'high / 1024 / true / {"a":1}',
    paramDescription: "Note (optional)",
    paramDescriptionPlaceholder: "Leave a note for your future self",
    addParam: "Add param",
    paramsRule:
      "Rule: custom request-body params go here; reasoning-effort levels go in Effort.",
    paramsRuleHint:
      "Params defines static extra request-body params (e.g. frequency_penalty, top_p) sent with every request. For per-level reasoning effort, don't add thinking params here — configure them in Effort.",
    effortNull:
      "Currently null: this model shows no effort slider and sends no effort param.",
    effortCreate: "Create effort levels",
    effortPath: "Param name (path)",
    effortPathInfo:
      "The request-body key that carries the effort value, e.g. reasoning_effort or thinking.type. Dots create nested objects.",
    effortDefault: "Default level",
    effortDefaultInfo:
      "Used when the user hasn't picked one manually; deleting the default level falls back to the first level.",
    effortDefaultPlaceholder: "Select default level",
    effortOffLabel: "Leftmost level label",
    effortOffLabelInfo: 'Text at the far left of the slider, usually "Off".',
    effortOffSeed: "Off",
    effortRule:
      "Rule: reasoning-effort levels go here; other custom request-body params go in Params.",
    effortRuleHint:
      "Effort is for reasoning intensity only: all levels share the param name set in path, and each level only fills in its own value. A null value omits the param (thinking off). For other custom params use Params.",
    levelTitle: "Level #{{index}}",
    levelLeftmost: "(leftmost / off)",
    levelRemove: "Remove this level",
    levelId: "Level ID",
    levelIdInfo:
      "Unique identifier for this level: the slider choice is stored in preferences under this ID. Changing an existing level's ID invalidates previously saved selections, which fall back to the default level.",
    levelLabel: "Display name",
    levelLabelPlaceholder: "Low / High / Max",
    levelValue: "Sent value",
    levelValueInfo:
      'The actual value written to the effort param at this level. Leave empty to omit the param (off); supports "low", 1024, true or full JSON.',
    levelValuePlaceholder: "high / 1024 / true; empty omits",
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
