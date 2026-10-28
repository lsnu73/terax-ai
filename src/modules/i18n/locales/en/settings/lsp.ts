/** 设置窗口 · Editor 区块内的语言服务器（LSP）部分。 */
export const settingsLsp = {
  label: "Language servers",
  server: {
    checking: "checking...",
    notFound: "not found on PATH",
    detectAgain: "Detect again",
    remove: "Remove server",
    switchEnableAria: "Enable {{name}} language server",
    switchDisableAria: "Disable {{name}} language server",
  },
  addCustom: "Add custom server",
  customDialog: {
    title: "Custom language server",
    name: "Name",
    command: "Command",
    arguments: "Arguments",
    fileExtensions: "File extensions",
    languageId: "LSP language id",
    rootMarkers: "Root markers",
    add: "Add server",
  },
  install: {
    title: "Install {{name}} language server",
    notFoundPre: "Terax could not find",
    notFoundPost:
      "on your PATH. Install it, then check again to enable this language server.",
    copyCommand: "Copy install command",
    manualHint:
      "Install this custom server manually and make sure its command is available on PATH.",
    stillNotFound:
      "Still not found. Finish the installation and make sure the command is available on PATH.",
    documentation: "Documentation",
    checking: "Checking...",
    checkAgain: "Check again",
  },
};
