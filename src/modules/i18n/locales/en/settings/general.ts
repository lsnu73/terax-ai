/** 设置窗口 · General 区块。 */
export const settingsGeneral = {
  header: {
    title: "General",
    description: "Mode, terminal, and startup.",
  },
  appearance: {
    label: "Appearance",
    system: "System",
    light: "Light",
    dark: "Dark",
    themesHintPre: "For theme, background and customization, see the ",
    themesHintTab: "Themes",
  },
  language: {
    title: "Language",
    description: "Interface language. System follows your OS language.",
    system: "System",
    en: "English",
    zh: "中文",
  },
  zoom: {
    label: "Zoom",
    uiLevel: "UI zoom level",
  },
  explorer: {
    label: "Explorer",
    showHidden: {
      title: "Show hidden files",
      description:
        "Include dot-prefixed files and folders (.env, .gitignore, .config) in the file explorer and search.",
    },
    gitDecorations: {
      title: "Git decorations",
      description:
        "Tint changed files and dim gitignored entries in the file explorer.",
    },
  },
  terminal: {
    label: "Terminal",
    renderer: {
      title: "Terminal renderer",
      description:
        "Automatic uses WebGPU with WebGL fallback. Choose WebGL for graphics compatibility. Applies to new terminals.",
      auto: "Automatic",
    },
    screenReader: {
      title: "Screen reader support",
      description:
        "Expose terminal output as accessible text. Page Up and Page Down browse history when the output region is focused.",
    },
    cursorBlink: {
      title: "Cursor blinking",
      description:
        "Blink the terminal cursor. Off by default for lower idle CPU, matching VS Code and the macOS terminal.",
    },
    cursorStyle: {
      title: "Cursor style",
      description: "Shape of the terminal cursor.",
      bar: "Bar",
      block: "Block",
      underline: "Underline",
    },
    fontFamily: {
      title: "Font family",
      description:
        'Nerd Font name for icons (e.g. "CaskaydiaCove Nerd Font Mono"). Leave blank to auto-detect.',
      placeholder: "Auto-detect",
    },
    fontWeight: {
      title: "Font weight",
      description: "Thickness of terminal characters",
      normal: "Normal",
      medium: "Medium",
      semiBold: "Semi-Bold",
      bold: "Bold",
    },
    shell: {
      title: "Integrated terminal shell",
      descriptionUnintegrated:
        "Command blocks and directory tracking are unavailable for this shell.",
      descriptionWsl:
        "Shell for the integrated terminal. WSL spaces use the distro login shell. Existing tabs keep their shell.",
      descriptionDefault:
        "Shell for new terminal tabs. Existing tabs keep their shell.",
      auto: "Auto",
    },
    workspaceEnv: {
      title: "Workspace environment",
      description:
        "Where new spaces run, terminal and AI agent alike: Windows or a WSL distro. Existing spaces keep theirs; switch any from the status bar.",
      windows: "Windows",
      unavailable: "{{name}} (unavailable)",
    },
    letterSpacing: {
      title: "Letter spacing",
      description:
        "Extra horizontal space between characters (px). Use negative values to tighten Nerd Fonts.",
    },
    fontSize: {
      title: "Font size",
      description: "Terminal text size.",
    },
    scrollback: {
      title: "Scrollback",
      description:
        "Lines of history kept per terminal. Higher uses more RAM (~3 KB / line).",
      lines: "{{lines}} lines",
    },
    pathHistory: {
      title: "Recent paths",
      description:
        "Directories left by the terminal are kept for Ctrl+E (recent paths). Shift+click on a path cd's to it.",
      entries_one: "{{count}} entry",
      entries_other: "{{count}} entries",
    },
    confirmClose: {
      title: "Confirm before killing a running process",
      description:
        "Ask before closing a terminal tab or quitting while a command is still running. Unsaved editor changes are always confirmed.",
    },
  },
  agents: {
    label: "Agents",
    notifications: {
      title: "Coding agent notifications",
      description:
        "Alert when a coding agent needs your input or finishes. Native notification when Terax is unfocused, in-app otherwise.",
    },
    sound: {
      title: "Notification sound",
      description: "Play a sound with agent notifications and in-app alerts.",
    },
    test: {
      waiting: "Switch apps...",
      sending: "Sending...",
      requested: "Requested",
      denied: "Blocked",
      failed: "Failed",
      idle: "Test in 2s",
      titleWaiting: "Switch to another app to verify native delivery",
      titleRequested: "The native notification was requested",
      titleDenied: "Notifications are disabled by the system",
      titleFailed: "Terax could not request a native notification",
      titleIdle: "Send a native test notification after two seconds",
    },
  },
  startup: {
    label: "Startup",
    launchAtLogin: {
      title: "Launch at login",
      description: "Open Terax automatically when you sign in.",
    },
    restoreWindow: {
      title: "Restore window position & size",
      description:
        "Reopen the main window where you left it. Applies on next launch.",
    },
  },
};
