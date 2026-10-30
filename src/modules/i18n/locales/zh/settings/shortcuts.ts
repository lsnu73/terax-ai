import type { settingsShortcuts } from "../../en/settings/shortcuts";

/** 设置窗口 · Shortcuts 区块。 */
export const settingsShortcutsZh: typeof settingsShortcuts = {
  header: {
    title: "快捷键",
    description: "查看和自定义键盘快捷键。",
  },
  searchPlaceholder: "搜索快捷键…",
  resetAll: "全部重置",
  unassigned: "未分配",
  resetToDefault: "重置为默认",
  clearShortcut: "清除快捷键",
  recording: "录制中…",
  escToCancel: "（按 Esc 取消）",
  terminalHistoryConflict: "Ctrl+R 已保留给终端历史命令搜索，请设置其他快捷键。",
  resetDialog: {
    title: "重置所有快捷键？",
    description:
      "这将把你所有的自定义键盘快捷键恢复为出厂默认设置。此操作无法撤销。",
  },
  groups: {
    general: "通用",
    tabs: "标签页",
    spaces: "空间",
    panes: "窗格",
    terminal: "终端",
    search: "搜索",
    ai: "AI",
    view: "视图",
    editor: "编辑器",
  },
};
