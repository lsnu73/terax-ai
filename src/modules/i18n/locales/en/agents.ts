/** 编码代理模块：启动面板、通知铃铛、系统原生通知。品牌名与命令名不翻译。 */
export const agents = {
  launcher: {
    back: "Back to new tab menu",
    title: "Launch agents",
    subtitle: "One workspace, up to four panes",
    instances: "Instances",
    instanceCount_one: "{{count}} instance",
    instanceCount_other: "{{count}} instances",
    startCommand: "Start command",
    reset: "Reset",
    resetTo: "Reset to {{command}}",
    commandHint: "Aliases and flags are supported.",
    launch_one: "Launch {{count}} agent",
    launch_other: "Launch {{count}} agents",
  },
  commandValidation: {
    empty: "Enter a start command.",
    tooLong: "Keep the command under {{max}} characters.",
    singleLine: "Use a single-line command.",
  },
  /** displayAgent 对未知代理 id 的兜底称呼。 */
  defaultName: "Agent",
  time: {
    justNow: "just now",
    minutes: "{{count}}m ago",
    hours: "{{count}}h ago",
    days: "{{count}}d ago",
  },
  bell: {
    title: "Notifications",
    header: "Notifications",
    activeCount_one: "{{count}} active",
    activeCount_other: "{{count}} active",
    clear: "Clear",
    copied: "Copied",
    emptyLine1: "No notifications yet.",
    emptyLine2: "Agent activity and app messages will appear here.",
    waiting: "waiting",
    working: "working",
    kindLabel: {
      attention: "needs input",
      finished: "finished",
      error: "failed",
    },
    alerts: "Agent alerts",
    alertsOn_one: "{{count}} on",
    alertsOn_other: "{{count}} on",
    enabled: "enabled",
    enable: "Enable",
    enabling: "Enabling",
  },
  /** 经铃铛/toast/原生通知送达的代理事件标题。 */
  notify: {
    needsInput: "{{name}} needs your input",
    finished: "{{name}} finished",
  },
  /** 设置页“测试通知”按钮发出的原生通知。 */
  notifyTest: {
    title: "Terax notifications are working",
    body: "You will be notified when an agent needs your attention.",
  },
  /** 应用内 toast 的动作按钮。 */
  toast: {
    open: "Open",
  },
};
