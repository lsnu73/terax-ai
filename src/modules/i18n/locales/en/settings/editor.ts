/** 设置窗口 · Editor 区块。 */
export const settingsEditor = {
  header: {
    title: "Editor",
    description: "Editing behavior, saving, and language servers.",
  },
  appearance: {
    label: "Appearance",
    fontSize: {
      title: "Font size",
      description: "Code editor text size.",
    },
  },
  editing: {
    label: "Editing",
    vim: {
      title: "Vim mode",
      description: "Enable Vim keybindings in the code editor.",
    },
    wordWrap: {
      title: "Word wrap",
      description: "Wrap long lines instead of scrolling horizontally.",
    },
    wrapColumn: {
      title: "Wrap column",
      description:
        "Soft-wrap at this column, or earlier when the editor is narrower.",
      unit: "columns",
    },
  },
  saving: {
    label: "Saving",
    autoSave: {
      title: "Auto save",
      description:
        "Automatically save files after a delay when changes are detected.",
    },
    autoSaveDelay: {
      title: "Auto save delay",
      description: "Delay before unsaved changes are saved automatically.",
    },
    formatOnSave: {
      title: "Format on save",
      description:
        "Format the file on explicit save (Cmd+S / :w) with the formatter below.",
    },
    formatter: {
      title: "Formatter",
      description:
        "Language server formats the buffer before writing; external tools run on the saved file from your PATH.",
      lsp: "Language server",
      custom: "Custom command",
    },
    customCommand: {
      title: "Custom command",
      description:
        "Runs on the saved file; {file} is replaced with the quoted path (appended when omitted).",
    },
    overrides: {
      title: "Language overrides",
      description:
        "Use a different formatter for specific languages (e.g. Ruff for Python).",
      add: "Add override",
      remove: "Remove override",
    },
  },
};
