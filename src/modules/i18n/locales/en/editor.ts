/** 编辑器：保存时格式化 toast、磁盘冲突、新建文件对话框、二进制/超大文件占位、AI/Git 差异视图、Markdown 预览提示。 */
export const editor = {
  format: {
    lspFailed: "Language server format failed",
    skipped: "Format on save skipped",
    noLspFormatter:
      "The active language server has no formatter. Pick an external one in Settings (Ruff for Python, Prettier, rustfmt, ...).",
    noLsp:
      "No active language server for this file. Enable one in the statusbar, or pick an external formatter in Settings.",
    failed: "{{formatter}} format failed",
    noCustomCommand: "No custom format command configured in Settings.",
    timedOut: "{{formatter}} timed out",
    failedGeneric: "{{formatter}} failed",
  },
  save: {
    conflictTitle: "File changed on disk",
    conflictDescription:
      "{{name}} was modified by another program while you had unsaved changes. Overwrite to keep your version.",
    overwrite: "Overwrite",
  },
  dialog: {
    title: "New file",
    description:
      "Filename (relative to workspace root). The extension determines the language mode.",
    nameRequired: "Name is required",
    pathRelative: "Path must be relative",
    noWorkspaceRoot: "No workspace root",
    cancel: "Cancel",
    create: "Create",
  },
  media: {
    loading: "Loading…",
    binaryFile: "Binary file",
    fileTooLarge: "File too large",
    syntaxDisabled: "syntax features disabled",
    previewNotSupported: "preview not supported",
    openAnyway: "Open anyway",
  },
  markdown: {
    saveToPreview: "Save to preview",
  },
  aiDiff: {
    pending: "Pending review",
    applied: "Applied",
    rejected: "Rejected",
    newFile: "New file",
    accept: "Accept",
    reject: "Reject",
  },
  gitDiff: {
    binaryFallback: "Binary / patch fallback",
    largeFileFallback: "Large file / patch view",
    loading: "Loading diff…",
    unavailable: "Diff preview is not available for this file.",
  },
};
