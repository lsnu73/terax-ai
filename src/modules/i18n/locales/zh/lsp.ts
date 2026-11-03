import type { lsp } from "../en/lsp";

/** LSP：状态栏胶囊（启用/安装/错误/运行中）、会话管理 toast、定义/引用结果面板标题。服务器名与命令不翻译。 */
export const lspZh: typeof lsp = {
  pill: {
    enable: "启用 {{name}} LSP",
    install: "安装 {{name}} LSP",
    startForWorkspace: "为此工作区启动 {{command}}",
    stoppedTitle: "语言服务器已停止",
    stoppedHeading: "{{name}} 语言服务器已停止",
    heading: "{{name}} 语言服务器",
    restart: "重启",
    disable: "禁用",
    dismiss: "关闭（可在设置中重新启用）",
    installHintPre: "Terax 在你的 PATH 中没有找到 ",
    installHintPost: "。请安装它，然后重新检查：",
    copyCommand: "复制命令",
    documentation: "文档",
    checking: "检查中...",
    checkAgain: "重新检查",
    startingTitle: "语言服务器正在启动",
    activeTitle: "语言服务器运行中",
    startingDescription: "{{command}} 正在为此工作区启动。",
    runningDescription: "{{command}} 正在为此工作区运行。",
  },
  toast: {
    failedToStart: "{{name}} 语言服务器启动失败",
    stopped: "{{name}} 语言服务器已停止",
    keepsCrashing: "{{name}} 语言服务器持续崩溃",
    exited: "{{name}} 语言服务器已退出",
    serverKeptCrashing: "服务器持续崩溃。",
    givingUp: "已放弃此工作区。",
  },
  panel: {
    definitions: "定义",
    references: "引用",
  },
};
