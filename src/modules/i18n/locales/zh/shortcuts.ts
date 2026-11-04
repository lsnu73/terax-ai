import type { shortcuts } from "../en/shortcuts";

/** 快捷键描述表。键与 ShortcutId 一一对应（shortcuts.<shortcutId>）。 */
export const shortcutsZh: typeof shortcuts = {
  commandPalette: {
    open: "打开命令面板",
    content: "在文件中查找",
  },
  settings: {
    open: "打开设置",
  },
  devtools: {
    open: "打开开发者工具",
  },
  tab: {
    new: "新建标签页",
    newPrivate: "新建隐私终端",
    newPreview: "新建网页预览",
    newEditor: "新建编辑器标签页",
    close: "关闭标签页或窗格",
    next: "下一个标签页",
    prev: "上一个标签页",
    selectByIndex: "跳转到标签页 1–9",
  },
  space: {
    next: "下一个空间",
    prev: "上一个空间",
    overview: "打开空间总览",
  },
  pane: {
    splitRight: "向右拆分窗格",
    splitDown: "向下拆分窗格",
    undoSplit: "撤销最近一次拆分",
    focusNext: "聚焦下一个窗格",
    focusPrev: "聚焦上一个窗格",
    swapLeft: "与左侧窗格交换",
    swapRight: "与右侧窗格交换",
    swapUp: "与上方窗格交换",
    swapDown: "与下方窗格交换",
    source: "切换源代码面板",
  },
  terminal: {
    clear: "清空终端",
    pathHistory: "最近路径（终端）",
  },
  search: {
    focus: "在标签页中查找",
  },
  explorer: {
    search: "搜索文件",
    focus: "切换文件管理器焦点",
    toggleHidden: "切换隐藏文件",
  },
  view: {
    zoomIn: "放大",
    zoomOut: "缩小",
    zoomReset: "重置缩放",
    zenMode: "切换禅模式",
  },
  ai: {
    toggle: "打开 AI 窗口",
    askSelection: "就选中内容询问 AI",
  },
  agent: {
    focusAttention: "跳转到需要注意的代理",
  },
  sidebar: {
    toggle: "切换左侧侧边栏",
  },
  editor: {
    undo: "撤销",
    redo: "重做",
    save: "保存文件",
    aiComplete: "触发 AI 补全",
    codeComplete: "触发代码补全",
  },
};
