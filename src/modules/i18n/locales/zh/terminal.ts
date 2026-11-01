import type { terminal } from "../en/terminal";

/** 终端：命令块工具栏/菜单、块内搜索、首运行水印、Shell 输入框、窗格错误态、PTY 暂停提示、拖放遮罩与无障碍标签。 */
export const terminalZh: typeof terminal = {
  block: {
    runAgain: "重新运行",
    actions: "命令块操作",
    copyCommand: "复制命令",
    copyOutput: "复制输出",
    copyCommandAndOutput: "复制命令和输出",
    attachToAi: "附加到 AI 对话",
    findInBlock: "在命令块中查找",
    commandCopied: "已复制命令",
    outputCopied: "已复制输出",
    blockCopied: "已复制命令块",
    searchFailed: "无法搜索此命令块",
    searching: "搜索中",
    previous: "上一个",
    next: "下一个",
    close: "关闭",
    exitCode: "退出码 {{code}}",
    commandFallback: "命令",
  },
  pane: {
    unableToDisplay: "无法显示终端",
    unableToStart: "无法启动终端",
    sessionPreserved: "你的终端会话已保留。重试以恢复其显示。",
    retryDisplay: "重试显示",
    retry: "重试",
  },
  pty: {
    outputPaused: "终端输出已暂停",
    outputFailedDescription: "终端无法处理输出。请重新打开此终端以恢复。",
    outputStalledDescription: "正在等待终端连接。输出将自动恢复传送。",
    retry: "重试",
  },
  psReadline: {
    missingTitle: "此 PowerShell 缺少 PSReadLine",
    missingDescription:
      "该 PowerShell 无法报告命令的开始位置，命令块（分组、复制、重新运行）因此不可用。安装 PSReadLine 后即可启用。",
    missingAction: "复制安装命令",
    installCommand: "Install-Module PSReadLine -Force -Scope CurrentUser",
  },
  drop: {
    overlay: "将文件路径放到此处",
  },
  a11y: {
    output: "终端输出。使用 Page Up 和 Page Down 浏览历史记录。",
    input: "终端输入",
    scrollback: "终端回滚区",
  },
  pathHistory: {
    title: "最近路径",
    searchPlaceholder: "筛选路径…",
    searchButton: "搜索",
    empty: "还没有路径历史。在终端里切换过目录后就会记录。",
    hintEnter: "回车或点击：在当前终端 cd 到该路径",
    hintLimit: "最多保留 {{limit}} 条（设置 → 通用 → 终端）",
    noTerminal: "没有可切换的终端。请先打开或聚焦一个终端标签页。",
  },
};
