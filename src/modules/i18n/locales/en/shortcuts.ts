/** 快捷键描述表。键与 ShortcutId 一一对应（shortcuts.<shortcutId>）。 */
export const shortcuts = {
  commandPalette: {
    open: "Open command palette",
    content: "Find in files",
  },
  settings: {
    open: "Open settings",
  },
  devtools: {
    open: "Open developer tools",
  },
  tab: {
    new: "New tab",
    newBlock: "New Blocks terminal",
    newPrivate: "New private terminal",
    newPreview: "New web preview",
    newEditor: "New editor tab",
    close: "Close tab or pane",
    next: "Next tab",
    prev: "Previous tab",
    selectByIndex: "Jump to tab 1–9",
  },
  space: {
    next: "Next space",
    prev: "Previous space",
    overview: "Open spaces",
  },
  pane: {
    splitRight: "Split pane right",
    splitDown: "Split pane down",
    undoSplit: "Undo last pane split",
    focusNext: "Focus next pane",
    focusPrev: "Focus previous pane",
    swapLeft: "Swap pane left",
    swapRight: "Swap pane right",
    swapUp: "Swap pane up",
    swapDown: "Swap pane down",
    source: "Toggle source panel",
  },
  terminal: {
    clear: "Clear terminal",
    toggleInput: "Toggle Shell / AI input",
  },
  blocks: {
    prev: "Previous command block",
    next: "Next command block",
  },
  search: {
    focus: "Find in tab",
  },
  explorer: {
    search: "Search files",
    focus: "Toggle file explorer focus",
    toggleHidden: "Toggle hidden files",
  },
  view: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomReset: "Reset zoom",
    zenMode: "Toggle zen mode",
  },
  ai: {
    toggle: "Toggle AI agent",
    toggleMini: "Toggle AI chat window",
    askSelection: "Ask AI about selection",
  },
  agent: {
    focusAttention: "Jump to agent needing attention",
  },
  sidebar: {
    toggle: "Toggle file explorer",
  },
  editor: {
    undo: "Undo",
    redo: "Redo",
    save: "Save file",
    aiComplete: "Trigger AI completion",
    codeComplete: "Trigger code completion",
  },
};
