import type { updater } from "../en/updater";

/** 更新对话框的全部文案（Linux 手动安装流程也在这里）。 */
export const updaterZh: typeof updater = {
  updateReady: "更新已就绪",
  downloading: "正在下载更新…",
  availableTitle: "Terax v{{version}} 已发布",
  readyDescription: "重启 Terax 以完成安装。",
  downloadProgress: "{{percent}}% — {{size}}",
  manualDescription:
    "你当前使用的是 v{{version}}。请选择你的发行版并运行命令，或从 GitHub 下载安装包。",
  defaultBody: "新版本已准备好安装。",
  copied: "已复制",
  later: "稍后",
  installRestart: "安装并重启",
  downloadPackage: "下载安装包",
};
