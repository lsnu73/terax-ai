/**
 * AI 模块的全部用户可见文案。按子区域嵌套组织。
 *
 * 注意：发给模型的 system prompt、工具描述、注入指令不在这里——
 * 它们是 LLM 输入，保持英文原样（见 lib/prompt.ts、config/prompts.ts、tools/*）。
 */
export const ai = {
  common: {
    thinking: "Thinking…",
    writing: "Writing",
    error: "Error",
    dismiss: "Dismiss",
    close: "Close",
    read: "Read",
    remove: "Remove",
  },
  panel: {
    configureModelFirst: "Configure an AI model before resizing the AI panel.",
  },
  statusbar: {
    openAiAgent: "Open AI agent",
    attachFile: "Attach file or image",
    closePanel: "Close AI panel",
    openChatWindow: "Open AI chat window",
    closeChatWindow: "Close AI chat window",
    stop: "Stop",
    send: "Send",
    sendEnter: "Send (Enter)",
  },
  proxy: {
    badge: "Proxy on",
    terminalLabel: "Terminal",
    sessionLabel: "AI chat",
    terminalEffect: "Commands run by AI in the terminal go through the proxy.",
    sessionEffect:
      "Model requests and streaming responses go through the proxy.",
  },
  modelPicker: {
    noModelConfigured: "No model configured — open Settings → Models",
    modelTitle: "Model: {{label}}",
    noKeyConfigured: "{{label}} — no key configured",
    selectModel: "Select model",
    searchPlaceholder: "Search models and providers…",
    tabAll: "All",
    tabFavorites: "Favorites",
    tabRecent: "Recent",
    allProviders: "All providers",
    providerNotConfigured: "{{label}} — not configured",
    noModelsYet: "No models yet — add a provider and a model in Settings.",
    noFavorites: "No favorites yet — star a model to pin it here.",
    noRecent: "No recently-used models.",
    noMatch: "No models match.",
    configureProvider: "Configure {{provider}} to use these models.",
    open: "Open",
    favorite: "Favorite",
    unfavorite: "Unfavorite",
    effortLevel: "思考等级",
    /** 兜底 off 档位标签；实际档位名来自模型配置。 */
    effortOff: "关闭",
    effortHint: "终端场景下思考会增加延迟，建议保持关闭。",
  },
  miniWindow: {
    closeEsc: "Close (Esc)",
    loadingSessions: "Loading sessions…",
    switchSession: "Switch session",
    newSession: "New session",
    deleteSession: "Delete session",
    emptyTitle: "Ask Terax anything",
    emptyBody:
      "Terax sees the active terminal — cwd, recent commands, and output.",
    suggestions: {
      explainError: {
        label: "Explain the last error",
        hint: "Read the terminal buffer",
        text: "Explain the last error in the terminal.",
      },
      generateCommand: {
        label: "Generate a command",
        hint: "Tell me what you want to do",
        text: "Give me a command to ",
      },
      summarizeBuffer: {
        label: "Summarize buffer",
        hint: "Recap recent activity",
        text: "Summarize what just happened in the terminal.",
      },
    },
  },
  approvalMode: {
    title: "Execution approval",
    review: "Ask me first",
    reviewHint: "Confirm every command and file edit",
    auto: "Auto execute",
    autoHint: "Run commands and edits without confirmation",
  },
  plan: {
    modeLabel: "Plan mode",
    queued_one: "· {{count}} queued",
    queued_other: "· {{count}} queued",
    noEditsQueued: "· no edits queued",
    exit: "Exit",
    reviewTitle: "Plan review",
    pendingChanges_one: "{{count}} pending change",
    pendingChanges_other: "{{count}} pending changes",
    discardAll: "Discard all",
    applyCount: "Apply {{count}}",
    toggleDiff: "Toggle diff",
    reject: "Reject",
    newBadge: "new",
    multiEdit: "multi-edit",
    createDirectory: "create directory",
    noLineChanges: "no line-level changes",
    moreChanges_one: "… {{count}} more change",
    moreChanges_other: "… {{count}} more changes",
  },
  context: {
    model: "Model",
    lastRequest: "Last request",
    estimated: "Estimated context",
    ofWhichCached: "Of which cached",
    sessionInput: "Session input",
    sessionOutput: "Session output",
    cacheHit: "Cache hit",
    window: "Window",
    footerMeasured:
      "Last request reflects current context size; session totals are cumulative.",
    footerEstimated: "Token count is approximate (chars / 4).",
  },
  chat: {
    emptyTitle: "Ask Terax anything",
    emptyDescription:
      "Explain command output, fix errors, generate snippets, or run a task.",
    requestFailed: "Request failed.",
    dismiss: "Dismiss",
    compactionNotice_one:
      "Context compacted — {{count}} older tool result elided to save tokens.",
    compactionNotice_other:
      "Context compacted — {{count}} older tool results elided to save tokens.",
    continueBody: "Hit the step limit. Continue to keep going.",
    continue: "Continue",
    editorSelection: "Editor selection",
    terminalSelection: "Terminal selection",
    readFiles_one: "{{count}} file",
    readFiles_other: "{{count}} files",
  },
  composer: {
    placeholder:
      "Ask Terax anything   -   # for snippets and commands, @ for files",
    removeCommand: "Remove command",
    removeSnippet: "Remove snippet",
    connectBody:
      "Connect any AI provider (or use local models) - your key stays in your OS keychain.",
    connectProvider: "Connect provider",
  },
  approval: {
    needsApproval: "needs approval",
    deny: "Deny",
    approve: "Approve",
    tools: {
      writeFile: "Write file",
      edit: "Edit file",
      multiEdit: "Edit file (batch)",
      createDirectory: "Create directory",
      bashRun: "Run shell command",
      bashBackground: "Spawn background process",
    },
    writeFileLines_one: "{{lines}} line · review in the diff tab",
    writeFileLines_other: "{{lines}} lines · review in the diff tab",
    replaceAll: " · replace all",
    editLines_one: "−{{removed}} / +{{added}} line · review in the diff tab",
    editLines_other: "−{{removed}} / +{{added}} lines · review in the diff tab",
    multiEditCount_one: "{{count}} edit · review in the diff tab",
    multiEditCount_other: "{{count}} edits · review in the diff tab",
  },
  agents: {
    title: "Role: {{name}}",
    builtIn: "Built-in",
    custom: "Custom",
    manage: "Manage roles…",
    builtin: {
      coder: {
        name: "Coder",
        description:
          "General-purpose coding assistant. Writes, edits, and runs.",
      },
      architect: {
        name: "Architect",
        description: "Design and tradeoffs. Plans before code.",
      },
      reviewer: {
        name: "Code Reviewer",
        description: "Reviews diffs for correctness, perf, security.",
      },
      security: {
        name: "Security",
        description: "Threat-models changes and flags vulns.",
      },
      designer: {
        name: "Designer",
        description: "UI/UX critique and refinement.",
      },
    },
  },
  pickers: {
    noSnippetMatches: "No matches. Add snippets in Settings → Agents.",
    prebuiltSnippets: "Pre-built snippets",
    snippets: "Snippets",
    workspaceFiles: "Workspace files",
    noWorkspace: "No workspace open",
    indexing: "Indexing workspace…",
    noMatchingFiles: "No matching files",
    largeWorkspace: "Workspace is large - refine your query to narrow results.",
  },
  selection: {
    askTerax: "Ask Terax",
  },
  todos: {
    title: "Todos",
  },
  statusPill: {
    openLog: "Open AI log",
  },
  notifications: {
    approvalTitle: "Terax needs your approval",
    approvalBody: "Approve a tool to continue",
    runFailed: "Terax run failed",
    finishedTitle: "Terax finished",
    finishedBody: "Your task is ready",
  },
  sessions: {
    newChat: "New chat",
    migrationFailed: "Some chat history could not be migrated",
    migrationRetry_one: "{{count}} conversation will be retried next launch.",
    migrationRetry_other:
      "{{count}} conversations will be retried next launch.",
    saveFailed: "Could not save conversation",
    retry: "Retry",
    damaged: "A conversation file was damaged",
    damagedBody: "It was set aside and the conversation starts empty.",
    openFailed: "Could not open conversation",
    loadFailed: "Could not load chat history",
    configLoadFailed: "Could not load model configuration",
  },
  errors: {
    fallback:
      "The AI provider rejected the request. Check the selected model and provider settings, then try again.",
    modelUnavailable: "Model unavailable",
    authenticationFailed: "Authentication failed",
    quotaExceeded: "Quota exceeded",
    rateLimitReached: "Rate limit reached",
  },
  security: {
    emptyPath: "Refused: empty path.",
    controlBytesInPath: "Refused: path contains control bytes.",
    sensitiveFile: 'Refused: "{{name}}" matches a sensitive-file pattern.',
    protectedDir: "Refused: path is inside a protected directory ({{dir}}).",
    writeDenied: 'Refused: writes under "{{prefix}}" are not allowed.',
    emptyCommand: "Refused: empty command.",
    controlCharsInCommand:
      "Refused: command contains control characters (including CR/LF). Commands must be single-line.",
    bidiOverride:
      "Refused: command contains Unicode bidirectional override characters.",
    deleteRoot:
      "Refused: command attempts to recursively delete the filesystem root.",
    deleteHome:
      "Refused: command attempts to recursively delete the home directory.",
    noPreserveRoot: "Refused: --no-preserve-root is not allowed.",
    ddBlockDevice: "Refused: dd to a block device is not allowed.",
    diskFormat: "Refused: disk-formatting commands are not allowed.",
    forkBomb: "Refused: fork-bomb pattern detected.",
    pipeToShell:
      "Refused: piping a network download directly into a shell is blocked. Download first, inspect, then run.",
  },
  steps: {
    reading: "Reading {{path}}",
    listing: "Listing {{path}}",
    grepping: "Grepping {{pattern}}",
    globbing: "Globbing {{pattern}}",
    editing: "Editing {{path}}",
    writingFile: "Writing {{path}}",
    creating: "Creating {{path}}",
    running: "Running {{command}}",
    spawning: "Spawning {{command}}",
    readingLogs: "Reading logs",
    listingProcesses: "Listing background processes",
    stoppingProcess: "Stopping background process",
    suggesting: "Suggesting {{command}}",
    updatingPlan_one: "Updating plan ({{count}} item)",
    updatingPlan_other: "Updating plan ({{count}} items)",
    spawningSubagent: "Spawning {{type}} subagent",
    calling: "Calling {{tool}}",
  },
  agentErrors: {
    noApiKey:
      "No API key configured for {{provider}}. Open Settings → Models to add one.",
    emptyBaseUrl:
      "{{provider}}: base URL is empty. Open Settings → Models to fill it in.",
    noModelConfigured:
      "No model configured. Open Settings → Models, add a provider and a model.",
    unsupportedProtocol: "Unsupported provider protocol: {{protocol}}",
  },
  slashCommands: {
    init: "Initialize workspace",
    plan: "Plan mode",
    claudeCode: "Delegate to Claude Code",
  },
  providerTest: {
    emptyBaseUrl: "Base URL is empty — fill in the endpoint address first.",
    successWithModels_one: "Connected — found {{count}} model.",
    successWithModels_other: "Connected — found {{count}} models.",
    successNoModels:
      "Connected (the endpoint did not return a recognizable model list).",
    authFailed: "Authentication failed (HTTP {{status}}) — check the API key.",
    noModelsApi:
      "Endpoint reachable, but this provider does not offer a model-list API (HTTP 404) — add models manually.",
    requestFailed: "Request failed (HTTP {{status}}){{detail}}",
    networkError: "Could not connect: {{message}}",
  },
  keyring: {
    emptyKey: "API key is empty",
    noKeyUsed: "{{provider}} does not use an API key",
  },
};
