/** 终端：命令块工具栏/菜单、块内搜索、首运行水印、Shell 输入框、窗格错误态、PTY 暂停提示、拖放遮罩与无障碍标签。 */
export const terminal = {
  block: {
    runAgain: "Run again",
    actions: "Block actions",
    copyCommand: "Copy command",
    copyOutput: "Copy output",
    copyCommandAndOutput: "Copy command and output",
    attachToAi: "Attach to AI chat",
    findInBlock: "Find in block",
    commandCopied: "Command copied",
    outputCopied: "Output copied",
    blockCopied: "Block copied",
    searchFailed: "Could not search this block",
    searching: "Searching",
    previous: "Previous",
    next: "Next",
    close: "Close",
    exitCode: "exit {{code}}",
    commandFallback: "command",
  },
  pane: {
    unableToDisplay: "Unable to display terminal",
    unableToStart: "Unable to start terminal",
    sessionPreserved:
      "Your terminal session is preserved. Retry to restore its display.",
    retryDisplay: "Retry display",
    retry: "Retry",
  },
  pty: {
    outputPaused: "Terminal output paused",
    outputFailedDescription:
      "The terminal could not process output. Reopen this terminal to recover.",
    outputStalledDescription:
      "Waiting for the terminal connection. Delivery will resume automatically.",
    retry: "Retry",
  },
  drop: {
    overlay: "Drop file path here",
  },
  a11y: {
    output: "Terminal output. Page Up and Page Down browse history.",
    input: "Terminal input",
    scrollback: "Terminal scrollback",
  },
  pathHistory: {
    title: "Recent paths",
    searchPlaceholder: "Filter paths...",
    searchButton: "Search",
    empty: "No recent paths. Change directory in a terminal to record one.",
    hintEnter: "Enter or click: cd the active terminal to the path",
    hintLimit: "Keeping up to {{limit}} entries (Settings → General → Terminal)",
    noTerminal: "No active terminal to switch. Open or focus a terminal tab first.",
  },
};
