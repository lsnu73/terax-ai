import type { agents } from "../en/agents";

/** 编码代理模块：启动面板、通知铃铛、系统原生通知。品牌名与命令名不翻译。 */
export const agentsZh: typeof agents = {
  launcher: {
    back: "返回新建标签页菜单",
    title: "启动代理",
    subtitle: "一个工作区，最多四个窗格",
    instances: "实例数",
    instanceCount_one: "{{count}} 个实例",
    instanceCount_other: "{{count}} 个实例",
    startCommand: "启动命令",
    reset: "重置",
    resetTo: "重置为 {{command}}",
    commandHint: "支持别名和参数。",
    launch_one: "启动 {{count}} 个代理",
    launch_other: "启动 {{count}} 个代理",
  },
  commandValidation: {
    empty: "请输入启动命令。",
    tooLong: "命令长度不能超过 {{max}} 个字符。",
    singleLine: "请使用单行命令。",
  },
  defaultName: "代理",
  time: {
    justNow: "刚刚",
    minutes: "{{count}} 分钟前",
    hours: "{{count}} 小时前",
    days: "{{count}} 天前",
  },
  bell: {
    title: "通知",
    header: "通知",
    activeCount_one: "{{count}} 个活跃",
    activeCount_other: "{{count}} 个活跃",
    clear: "清空",
    copied: "已复制",
    emptyLine1: "还没有通知。",
    emptyLine2: "代理活动和软件运行消息会显示在这里。",
    waiting: "等待中",
    working: "工作中",
    kindLabel: {
      attention: "需要输入",
      finished: "已完成",
      error: "失败",
    },
    alerts: "代理提醒",
    alertsOn_one: "已开启 {{count}} 个",
    alertsOn_other: "已开启 {{count}} 个",
    enabled: "已启用",
    enable: "启用",
    enabling: "启用中",
  },
  notify: {
    needsInput: "{{name}} 需要你的输入",
    finished: "{{name}} 已完成",
  },
  notifyTest: {
    title: "Terax 通知工作正常",
    body: "当代理需要你处理时，你会收到通知。",
  },
  toast: {
    open: "打开",
  },
};
