import type { statusbar } from "../en/statusbar";

/** 状态栏：隐私标记、路径面包屑、工作区环境选择器。 */
export const statusbarZh: typeof statusbar = {
  privateBadge: "隐私：对 AI 不可见",
  privateTooltip:
    "AI 无法看到此终端的输出。可用于密码、SSH 或任何你不希望发送给模型的内容。",
  noDirectory: "无目录",
  home: "主目录",
  noSubfolders: "没有子文件夹",
  showHiddenFolders: "显示隐藏的文件夹",
  workspaceEnvironment: "工作区环境",
  windowsLocal: "Windows 本地",
  loadingWslDistros: "正在加载 WSL 发行版…",
  wslUnavailable: "WSL 不可用",
  noWslDistros: "未找到 WSL 发行版",
  refresh: "刷新",
};
