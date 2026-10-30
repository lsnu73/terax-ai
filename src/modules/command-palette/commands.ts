import type { SearchTarget } from "@/modules/header";
import { MAX_PANES_PER_TAB, type Tab } from "@/modules/tabs";
import { leafIds } from "@/modules/terminal";
import {
  Cancel01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  FileSearchIcon,
  Globe02Icon,
  IncognitoIcon,
  KeyboardIcon,
  LayoutTwoColumnIcon,
  LayoutTwoRowIcon,
  PaintBoardIcon,
  Search01Icon,
  Settings01Icon,
  SidebarLeftIcon,
  SourceCodeIcon,
  SparklesIcon,
  TerminalIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import type { PaletteItem } from "./types";

export const COMMAND_GROUPS = [
  "General",
  "Spaces",
  "Tabs",
  "Panes",
  "Git",
  "Search",
  "View",
  "AI",
] as const;

export type CommandPaletteActionContext = {
  tabs: Tab[];
  activeId: number;
  searchTarget: SearchTarget;
  explorerRoot: string | null;
  home: string | null;
  openNewTab: () => void;
  openNewPrivate: () => void;
  openNewEditor: () => void;
  openNewPreview: () => void;
  openGitGraph: () => void;
  toggleSourceControl: () => void;
  closeActiveTabOrPane: () => void;
  splitPaneRight: () => void;
  splitPaneDown: () => void;
  focusSearch: () => void;
  focusExplorerSearch: () => void;
  toggleSidebar: () => void;
  toggleHiddenFiles: () => void;
  toggleAi: () => void;
  askAiSelection: () => void;
  openSettings: () => void;
  openKeyboardShortcuts: () => void;
  spaces: { id: string; name: string }[];
  activeSpaceId: string | null;
  openSpacesOverview: () => void;
  newSpace: () => void;
  switchSpace: (id: string) => void;
};

const noop = () => {};

export function createCommandItems(
  ctx: CommandPaletteActionContext,
): PaletteItem[] {
  const activeTab = ctx.tabs.find((tab) => tab.id === ctx.activeId);
  const activeTerminalTab = activeTab?.kind === "terminal" ? activeTab : null;
  const activePaneCount = activeTerminalTab
    ? leafIds(activeTerminalTab.paneTree).length
    : 0;
  const onlyOneTab = ctx.tabs.length < 2;
  const noWorkspaceRoot = !ctx.explorerRoot && !ctx.home;
  const splitDisabled = !activeTerminalTab
    ? "commands.disabled.noTerminalTab"
    : activePaneCount >= MAX_PANES_PER_TAB
      ? "commands.disabled.paneLimit"
      : undefined;
  const closeDisabled =
    onlyOneTab && activePaneCount < 2 ? "commands.disabled.lastTab" : undefined;

  return [
    {
      id: "settings.open",
      titleKey: "commands.general.openSettings",
      group: "General",
      keywords: ["preferences", "config"],
      icon: Settings01Icon,
      shortcutId: "settings.open",
      run: ctx.openSettings,
    },
    {
      id: "theme.pick",
      titleKey: "commands.general.changeTheme",
      group: "General",
      keywords: ["theme", "appearance", "color", "dark", "light"],
      icon: PaintBoardIcon,
      run: noop,
    },
    {
      id: "shortcuts.open",
      titleKey: "commands.general.keyboardShortcuts",
      group: "General",
      keywords: ["keys", "keybindings", "settings"],
      icon: KeyboardIcon,
      run: ctx.openKeyboardShortcuts,
    },
    {
      id: "spaces.overview",
      titleKey: "commands.spaces.overview",
      group: "Spaces",
      keywords: [
        "spaces",
        "sessions",
        "overview",
        "organize",
        "manage",
        "move",
      ],
      icon: DashboardSquare01Icon,
      run: ctx.openSpacesOverview,
    },
    {
      id: "spaces.new",
      titleKey: "commands.spaces.new",
      group: "Spaces",
      keywords: ["space", "session", "workspace", "group", "create"],
      icon: DashboardSquare01Icon,
      run: ctx.newSpace,
    },
    ...ctx.spaces.map((sp) => ({
      id: `spaces.switch.${sp.id}`,
      titleKey: "commands.spaces.switchTo",
      titleParams: { name: sp.name },
      group: "Spaces" as const,
      keywords: ["space", "switch", "session", sp.name],
      icon: DashboardSquare01Icon,
      disabledReasonKey:
        sp.id === ctx.activeSpaceId
          ? "commands.disabled.currentSpace"
          : undefined,
      run: () => ctx.switchSpace(sp.id),
    })),
    {
      id: "tab.new",
      titleKey: "commands.tabs.newTerminal",
      group: "Tabs",
      keywords: ["shell", "terminal", "new tab"],
      icon: TerminalIcon,
      shortcutId: "tab.new",
      run: ctx.openNewTab,
    },
    {
      id: "tab.newPrivate",
      titleKey: "commands.tabs.newPrivateTerminal",
      group: "Tabs",
      keywords: ["privacy", "private", "incognito", "hidden from ai"],
      icon: IncognitoIcon,
      shortcutId: "tab.newPrivate",
      run: ctx.openNewPrivate,
    },
    {
      id: "tab.newEditor",
      titleKey: "commands.tabs.newEditorTab",
      group: "Tabs",
      keywords: ["file", "editor", "create"],
      icon: FileEditIcon,
      shortcutId: "tab.newEditor",
      disabledReasonKey: noWorkspaceRoot
        ? "commands.disabled.noWorkspaceRoot"
        : undefined,
      run: ctx.openNewEditor,
    },
    {
      id: "tab.newPreview",
      titleKey: "commands.tabs.newWebPreview",
      group: "Tabs",
      keywords: ["browser", "web", "localhost", "preview"],
      icon: Globe02Icon,
      shortcutId: "tab.newPreview",
      run: ctx.openNewPreview,
    },
    {
      id: "tab.close",
      titleKey: "commands.tabs.closeTabOrPane",
      group: "Tabs",
      keywords: ["close", "remove", "pane"],
      icon: Cancel01Icon,
      shortcutId: "tab.close",
      disabledReasonKey: closeDisabled,
      run: ctx.closeActiveTabOrPane,
    },
    {
      id: "pane.splitRight",
      titleKey: "commands.panes.splitRight",
      group: "Panes",
      keywords: ["terminal", "pane", "split", "right", "column"],
      icon: LayoutTwoColumnIcon,
      shortcutId: "pane.splitRight",
      disabledReasonKey: splitDisabled,
      run: ctx.splitPaneRight,
    },
    {
      id: "pane.splitDown",
      titleKey: "commands.panes.splitDown",
      group: "Panes",
      keywords: ["terminal", "pane", "split", "down", "row"],
      icon: LayoutTwoRowIcon,
      shortcutId: "pane.splitDown",
      disabledReasonKey: splitDisabled,
      run: ctx.splitPaneDown,
    },
    {
      id: "git.graph",
      titleKey: "commands.git.openGraph",
      group: "Git",
      keywords: ["git", "graph", "history", "log", "commits"],
      icon: SourceCodeIcon,
      run: ctx.openGitGraph,
    },
    {
      id: "git.source",
      titleKey: "commands.git.toggleSourceControl",
      group: "Git",
      keywords: ["git", "source control", "changes", "staging", "diff"],
      icon: SourceCodeIcon,
      shortcutId: "pane.source",
      run: ctx.toggleSourceControl,
    },
    {
      id: "search.content",
      titleKey: "commands.search.findContent",
      group: "Search",
      keywords: ["grep", "ripgrep", "text", "contents", "search in files"],
      icon: FileSearchIcon,
      trailing: "#",
      run: noop,
    },
    {
      id: "history.open",
      titleKey: "commands.search.commandHistory",
      group: "Search",
      keywords: ["history", "shell", "rerun", "previous commands"],
      icon: TerminalIcon,
      trailing: ">",
      run: noop,
    },
    {
      id: "search.focus",
      titleKey: "commands.search.findInTab",
      group: "Search",
      keywords: ["find", "terminal", "editor", "current"],
      icon: Search01Icon,
      shortcutId: "search.focus",
      disabledReasonKey: ctx.searchTarget
        ? undefined
        : "commands.disabled.noSearchableView",
      run: ctx.focusSearch,
    },
    {
      id: "explorer.search",
      titleKey: "commands.search.searchFiles",
      group: "Search",
      keywords: ["explorer", "workspace", "file", "open"],
      icon: Search01Icon,
      shortcutId: "explorer.search",
      disabledReasonKey: ctx.explorerRoot
        ? undefined
        : "commands.disabled.noWorkspaceRoot",
      run: ctx.focusExplorerSearch,
    },
    {
      id: "sidebar.toggle",
      titleKey: "commands.view.toggleFileExplorer",
      group: "View",
      keywords: ["sidebar", "files", "explorer"],
      icon: SidebarLeftIcon,
      shortcutId: "sidebar.toggle",
      run: ctx.toggleSidebar,
    },
    {
      id: "explorer.toggleHidden",
      titleKey: "commands.view.toggleHiddenFiles",
      group: "View",
      keywords: ["dotfiles", "hidden", "explorer", "gitignore", "env"],
      icon: ViewIcon,
      shortcutId: "explorer.toggleHidden",
      run: ctx.toggleHiddenFiles,
    },
    {
      id: "ai.toggle",
      titleKey: "commands.ai.toggleAgent",
      group: "AI",
      keywords: ["assistant", "chat", "agent"],
      icon: SparklesIcon,
      shortcutId: "ai.toggle",
      run: ctx.toggleAi,
    },
    {
      id: "ai.askSelection",
      titleKey: "commands.ai.askAboutSelection",
      group: "AI",
      keywords: ["selection", "explain", "assistant", "chat"],
      icon: SparklesIcon,
      shortcutId: "ai.askSelection",
      run: ctx.askAiSelection,
    },
  ];
}
