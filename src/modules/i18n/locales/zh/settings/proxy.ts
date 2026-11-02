import type { settingsProxy } from "../../en/settings/proxy";

/** 设置窗口 · 代理分区。 */
export const settingsProxyZh: typeof settingsProxy = {
  header: {
    title: "代理",
    description: "让终端、AI 会话和更新流量经过本地 HTTP 代理。",
  },
  server: {
    label: "代理服务器",
    host: "代理地址",
    hostPlaceholder: "localhost",
    port: "端口",
    portPlaceholder: "7890",
  },
  scenarios: {
    label: "代理生效场景",
    terminal: "终端",
    terminalDescription:
      "新建终端自动生效；已打开的终端右键标签页选「刷新」。AI 问答执行的命令也走此代理，下一条命令即生效，无需刷新会话（已运行的后台进程需重启）。",
    ai: "AI 会话",
    aiDescription:
      "仅模型请求与流式响应经过代理；AI 执行的命令跟随「终端代理」设置。",
    updater: "更新",
    updaterDescription: "更新检查与下载经过代理。",
    enableAll: "全部开启",
    disableAll: "全部关闭",
  },
  software: {
    label: "代理软件",
    path: "软件路径",
    pathPlaceholder: "代理软件启动路径",
    autoLaunch: "自动启动",
    autoLaunchDescription:
      "已设置代理且任一场景启用时，若代理软件未运行则自动打开它。",
    autoLaunchFailed: "代理软件自动启动失败",
  },
};
