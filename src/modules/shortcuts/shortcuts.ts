import { IS_MAC, MOD_PROP } from "@/lib/platform";

/**
 * Single source of truth for keyboard shortcuts.
 */

export type ShortcutId =
  | "commandPalette.open"
  | "commandPalette.content"
  | "devtools.open"
  | "tab.new"
  | "tab.newPrivate"
  | "tab.newPreview"
  | "tab.newEditor"
  | "tab.close"
  | "tab.next"
  | "tab.prev"
  | "tab.selectByIndex"
  | "space.next"
  | "space.prev"
  | "space.overview"
  | "pane.splitRight"
  | "pane.splitDown"
  | "pane.undoSplit"
  | "pane.focusNext"
  | "pane.focusPrev"
  | "pane.swapLeft"
  | "pane.swapRight"
  | "pane.swapUp"
  | "pane.swapDown"
  | "pane.source"
  | "terminal.clear"
  | "terminal.pathHistory"
  | "search.focus"
  | "explorer.search"
  | "explorer.focus"
  | "explorer.toggleHidden"
  | "view.zoomIn"
  | "view.zoomOut"
  | "view.zoomReset"
  | "view.zenMode"
  | "ai.toggle"
  | "ai.askSelection"
  | "agent.focusAttention"
  | "settings.open"
  | "sidebar.toggle"
  | "editor.undo"
  | "editor.redo"
  | "editor.save"
  | "editor.aiComplete"
  | "editor.codeComplete";

export type ShortcutGroup =
  | "General"
  | "Tabs"
  | "Spaces"
  | "Panes"
  | "Terminal"
  | "Search"
  | "AI"
  | "View"
  | "Editor";

export type KeyBinding = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export function isTerminalHistoryBinding(binding: KeyBinding): boolean {
  return (
    binding.key.toLowerCase() === "r" &&
    !!binding.ctrl &&
    !binding.shift &&
    !binding.alt &&
    !binding.meta
  );
}

export type Shortcut = {
  id: ShortcutId;
  labelKey: string;
  group: ShortcutGroup;
  defaultBindings: KeyBinding[];
  allowRepeat?: boolean;
};

export const SHORTCUTS: Shortcut[] = [
  {
    id: "commandPalette.open",
    labelKey: "shortcuts.commandPalette.open",
    group: "General",
    defaultBindings: [{ [MOD_PROP]: true, key: "p" }],
  },
  {
    id: "commandPalette.content",
    labelKey: "shortcuts.commandPalette.content",
    group: "General",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "p" }],
  },
  {
    id: "settings.open",
    labelKey: "shortcuts.settings.open",
    group: "General",
    defaultBindings: [{ [MOD_PROP]: true, key: "," }],
  },
  {
    id: "devtools.open",
    labelKey: "shortcuts.devtools.open",
    group: "View",
    defaultBindings: [
      { [MOD_PROP]: true, alt: true, key: "i" },
      { key: "F12" },
    ],
  },
  {
    id: "tab.new",
    labelKey: "shortcuts.tab.new",
    group: "Tabs",
    defaultBindings: [{ [MOD_PROP]: true, key: "t" }],
  },
  {
    id: "tab.newPrivate",
    labelKey: "shortcuts.tab.newPrivate",
    group: "Tabs",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "t" }],
  },
  {
    id: "tab.newPreview",
    labelKey: "shortcuts.tab.newPreview",
    group: "Tabs",
    // Cmd/Ctrl+P now opens the command palette, so web preview moves here.
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "o" }],
  },
  {
    id: "tab.newEditor",
    labelKey: "shortcuts.tab.newEditor",
    group: "Tabs",
    defaultBindings: [{ [MOD_PROP]: true, alt: true, key: "e" }],
  },
  {
    id: "tab.close",
    labelKey: "shortcuts.tab.close",
    group: "Tabs",
    defaultBindings: [{ [MOD_PROP]: true, key: "w" }],
  },
  {
    id: "pane.splitRight",
    labelKey: "shortcuts.pane.splitRight",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, key: "d" }],
  },
  {
    id: "pane.splitDown",
    labelKey: "shortcuts.pane.splitDown",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "d" }],
  },
  {
    id: "pane.undoSplit",
    labelKey: "shortcuts.pane.undoSplit",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "z" }],
  },
  {
    id: "pane.focusNext",
    labelKey: "shortcuts.pane.focusNext",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, key: "]" }],
  },
  {
    id: "pane.focusPrev",
    labelKey: "shortcuts.pane.focusPrev",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, key: "[" }],
  },
  {
    id: "pane.swapLeft",
    labelKey: "shortcuts.pane.swapLeft",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, alt: true, key: "ArrowLeft" }],
  },
  {
    id: "pane.swapRight",
    labelKey: "shortcuts.pane.swapRight",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, alt: true, key: "ArrowRight" }],
  },
  {
    id: "pane.swapUp",
    labelKey: "shortcuts.pane.swapUp",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, alt: true, key: "ArrowUp" }],
  },
  {
    id: "pane.swapDown",
    labelKey: "shortcuts.pane.swapDown",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, alt: true, key: "ArrowDown" }],
  },
  {
    id: "pane.source",
    labelKey: "shortcuts.pane.source",
    group: "Panes",
    defaultBindings: [{ [MOD_PROP]: true, key: "g" }],
  },
  {
    id: "terminal.pathHistory",
    labelKey: "shortcuts.terminal.pathHistory",
    group: "Terminal",
    // Ctrl/Cmd+E. Only fires while a terminal tab is active (see App's
    // shortcutsDisabled); elsewhere the key does nothing. tab.newEditor moved
    // to Mod+Alt+E when this action claimed Ctrl+E.
    defaultBindings: [{ [MOD_PROP]: true, key: "e" }],
  },
  {
    id: "terminal.clear",
    labelKey: "shortcuts.terminal.clear",
    group: "Terminal",
    // macOS Terminal's ⌘K (clear scrollback, keep the prompt). Default only on
    // macOS — on other platforms Ctrl+K is readline's kill-line, so we leave it
    // unbound and let users assign their own in settings.
    defaultBindings: IS_MAC ? [{ meta: true, key: "k" }] : [],
  },
  {
    id: "tab.next",
    labelKey: "shortcuts.tab.next",
    group: "Tabs",
    defaultBindings: [{ ctrl: true, key: "Tab" }],
    allowRepeat: true,
  },
  {
    id: "tab.prev",
    labelKey: "shortcuts.tab.prev",
    group: "Tabs",
    defaultBindings: [{ ctrl: true, shift: true, key: "Tab" }],
    allowRepeat: true,
  },
  {
    id: "tab.selectByIndex",
    labelKey: "shortcuts.tab.selectByIndex",
    group: "Tabs",
    defaultBindings: [{ [MOD_PROP]: true, key: "1" }],
  },
  {
    id: "space.next",
    labelKey: "shortcuts.space.next",
    group: "Spaces",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "]" }],
  },
  {
    id: "space.prev",
    labelKey: "shortcuts.space.prev",
    group: "Spaces",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "[" }],
  },
  {
    id: "space.overview",
    labelKey: "shortcuts.space.overview",
    group: "Spaces",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "s" }],
  },
  {
    id: "explorer.search",
    labelKey: "shortcuts.explorer.search",
    group: "Search",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "f" }],
  },
  {
    id: "search.focus",
    labelKey: "shortcuts.search.focus",
    group: "Search",
    defaultBindings: [{ [MOD_PROP]: true, key: "f" }],
  },
  {
    id: "ai.toggle",
    labelKey: "shortcuts.ai.toggle",
    group: "AI",
    defaultBindings: [{ [MOD_PROP]: true, key: "i" }],
  },
  {
    id: "ai.askSelection",
    labelKey: "shortcuts.ai.askSelection",
    group: "AI",
    // Keep Mod+L available to the shell for clear-screen, including when
    // terminal text is selected and this shortcut is otherwise eligible.
    defaultBindings: [{ [MOD_PROP]: true, key: "j" }],
  },
  {
    id: "agent.focusAttention",
    labelKey: "shortcuts.agent.focusAttention",
    group: "AI",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "a" }],
  },
  {
    id: "sidebar.toggle",
    labelKey: "shortcuts.sidebar.toggle",
    group: "View",
    // Mod+Shift+B toggles the sidebar everywhere, including a focused
    // terminal. Plain Mod+B is deliberately not a default: it is readline's
    // backward-char and Claude Code's "run in background" key, so the
    // terminal keeps it (App's shortcutsDisabled also defers any
    // user-assigned plain Mod+B binding while a terminal is focused).
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "b" }],
  },
  {
    id: "explorer.focus",
    labelKey: "shortcuts.explorer.focus",
    group: "View",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "e" }],
  },
  {
    id: "explorer.toggleHidden",
    labelKey: "shortcuts.explorer.toggleHidden",
    group: "View",
    // Finder's toggle. The binding is on the physical Period key, so it holds
    // on layouts where Shift+. types something else.
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "." }],
  },
  {
    id: "view.zoomIn",
    labelKey: "shortcuts.view.zoomIn",
    group: "View",
    defaultBindings: [
      { [MOD_PROP]: true, key: "=" },
      { [MOD_PROP]: true, shift: true, key: "+" },
    ],
    allowRepeat: true,
  },
  {
    id: "view.zoomOut",
    labelKey: "shortcuts.view.zoomOut",
    group: "View",
    defaultBindings: [
      { [MOD_PROP]: true, key: "-" },
      { [MOD_PROP]: true, shift: true, key: "_" },
    ],
    allowRepeat: true,
  },
  {
    id: "view.zoomReset",
    labelKey: "shortcuts.view.zoomReset",
    group: "View",
    defaultBindings: [{ [MOD_PROP]: true, key: "0" }],
  },
  {
    id: "view.zenMode",
    labelKey: "shortcuts.view.zenMode",
    group: "View",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "'" }],
  },
  // Editor undo/redo: App.tsx registers handlers and useGlobalShortcuts
  // preventDefaults on match. Keep Mod+Y and add macOS Mod+Shift+Z (#941).
  // Still excluded from the customization UI in ShortcutsSection.
  {
    id: "editor.undo",
    labelKey: "shortcuts.editor.undo",
    group: "Editor",
    defaultBindings: [{ [MOD_PROP]: true, key: "z" }],
  },
  {
    id: "editor.redo",
    labelKey: "shortcuts.editor.redo",
    group: "Editor",
    defaultBindings: [
      { [MOD_PROP]: true, key: "y" },
      { [MOD_PROP]: true, shift: true, key: "z" },
    ],
  },
  // Mod+S at the app layer so WKWebView cannot steal "Save Page" (#969).
  // CodeMirror also binds Mod-s; the global handler preventDefaults first.
  {
    id: "editor.save",
    labelKey: "shortcuts.editor.save",
    group: "Editor",
    defaultBindings: [{ [MOD_PROP]: true, key: "s" }],
  },
  {
    id: "editor.aiComplete",
    labelKey: "shortcuts.editor.aiComplete",
    group: "Editor",
    defaultBindings: [{ alt: true, key: "\\" }],
  },
  {
    id: "editor.codeComplete",
    labelKey: "shortcuts.editor.codeComplete",
    group: "Editor",
    defaultBindings: [{ ctrl: true, key: " " }],
  },
];

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  "General",
  "Tabs",
  "Panes",
  "Terminal",
  "View",
  "Search",
  "AI",
  "Editor",
];

/**
 * Matching logic: checks if a KeyboardEvent matches a KeyBinding.
 */
const CODE_TO_KEY: Record<string, string> = {
  Backslash: "\\",
  Slash: "/",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  Space: " ",
};

// Option and Shift combinations rewrite e.key (macOS Option gives "«", "…",
// dead keys; Shift turns "." into ">"); the physical key survives in e.code.
function keyFromCode(code: string): string | null {
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  return CODE_TO_KEY[code] ?? null;
}

export function matchBinding(
  e: KeyboardEvent,
  binding: KeyBinding,
  id?: ShortcutId,
): boolean {
  const eventKey = e.key.toLowerCase();
  const bindingKey = binding.key.toLowerCase();

  // Special case for Jump to Tab 1-9
  if (id === "tab.selectByIndex") {
    if (!/^[1-9]$/.test(e.key)) return false;
  } else if (eventKey !== bindingKey) {
    if (!binding.alt && !binding.shift) return false;
    if (keyFromCode(e.code) !== bindingKey) return false;
  }

  return (
    !!e.ctrlKey === !!binding.ctrl &&
    !!e.shiftKey === !!binding.shift &&
    !!e.altKey === !!binding.alt &&
    !!e.metaKey === !!binding.meta
  );
}

/**
 * Display helpers
 */
export function getBindingTokens(binding?: KeyBinding): string[] {
  if (!binding) return [];
  const tokens: string[] = [];
  if (IS_MAC) {
    if (binding.ctrl) tokens.push("⌃");
    if (binding.alt) tokens.push("⌥");
    if (binding.shift) tokens.push("⇧");
    if (binding.meta) tokens.push("⌘");
  } else {
    if (binding.ctrl) tokens.push("Ctrl");
    if (binding.alt) tokens.push("Alt");
    if (binding.shift) tokens.push("Shift");
    if (binding.meta) tokens.push("Win");
  }

  let keyLabel = binding.key;
  if (keyLabel === " ") keyLabel = "Space";
  else if (keyLabel === "ArrowUp") keyLabel = "↑";
  else if (keyLabel === "ArrowDown") keyLabel = "↓";
  else if (keyLabel === "ArrowLeft") keyLabel = "←";
  else if (keyLabel === "ArrowRight") keyLabel = "→";
  else if (keyLabel.length === 1) keyLabel = keyLabel.toUpperCase();

  tokens.push(keyLabel);
  return tokens;
}
