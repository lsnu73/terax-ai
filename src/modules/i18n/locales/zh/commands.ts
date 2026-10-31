import type { commands } from "../en/commands";

/** 命令面板的命令标题、分组名与 UI 文案。 */
export const commandsZh: typeof commands = {
  groups: {
    general: "常规",
    spaces: "空间",
    tabs: "标签页",
    panes: "窗格",
    git: "Git",
    search: "搜索",
    view: "视图",
    ai: "AI",
  },
  general: {
    openSettings: "打开设置",
    changeTheme: "更改主题…",
    keyboardShortcuts: "键盘快捷键",
  },
  spaces: {
    overview: "空间：总览",
    new: "新建空间",
    switchTo: "切换到 {{name}}",
  },
  tabs: {
    newTerminal: "新建终端",
    newPrivateTerminal: "新建隐私终端",
    newEditorTab: "新建编辑器标签页",
    newWebPreview: "新建网页预览",
    closeTabOrPane: "关闭标签页或窗格",
  },
  panes: {
    splitRight: "向右拆分窗格",
    splitDown: "向下拆分窗格",
  },
  git: {
    openGraph: "打开 Git 图谱",
    toggleSourceControl: "切换源代码管理",
  },
  search: {
    findContent: "在文件中查找内容",
    findInTab: "在当前标签页中查找",
    searchFiles: "按名称搜索文件",
  },
  view: {
    toggleFileExplorer: "切换文件管理器",
    toggleHiddenFiles: "切换隐藏文件",
  },
  ai: {
    toggleAgent: "切换 AI 角色",
    askAboutSelection: "就选中内容询问 AI",
  },
  disabled: {
    noTerminalTab: "没有终端标签页",
    paneLimit: "已达窗格上限",
    lastTab: "最后一个标签页",
    noWorkspaceRoot: "没有工作区根目录",
    currentSpace: "当前空间",
    noSearchableView: "没有可搜索的视图",
  },
  palette: {
    title: "命令面板",
    description: "运行命令、切换主题或搜索工作区。",
    placeholderCommands: "输入命令，# 在文件中查找",
    placeholderContent: "在文件中查找文本…",
    placeholderThemes: "搜索主题…",
    placeholderPaths: "搜索最近路径…",
    themesHeading: "主题",
    noThemes: "没有主题",
    contentsHeading: "内容",
    pathsHeading: "终端最近路径",
    noPaths: "还没有路径历史。在终端里切换过目录后就会记录。",
    typeMinChars: "至少输入 2 个字符",
    noMatches: "无匹配结果",
    searchModesHeading: "搜索模式",
    searchFailed: "搜索失败",
    searching: "搜索中…",
    emptyHint: "未找到命令。输入 ? 查看搜索模式。",
    modeContent: "在文件中查找文本",
    modePaths: "终端最近路径",
  },
};
