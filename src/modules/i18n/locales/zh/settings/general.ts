import type { settingsGeneral } from "../../en/settings/general";

/** 设置窗口 · General 区块。 */
export const settingsGeneralZh: typeof settingsGeneral = {
  header: {
    title: "通用",
    description: "外观模式、终端与启动。",
  },
  appearance: {
    label: "外观",
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
    themesHintPre: "主题、背景与个性化设置，请见",
    themesHintTab: "主题",
  },
  language: {
    title: "语言",
    description: "界面语言。跟随系统时使用操作系统语言。",
    system: "跟随系统",
    en: "English",
    zh: "中文",
  },
  zoom: {
    label: "缩放",
    uiLevel: "界面缩放级别",
  },
  explorer: {
    label: "文件管理器",
    showHidden: {
      title: "显示隐藏文件",
      description:
        "在文件管理器和搜索中显示以点号开头的文件和文件夹（.env、.gitignore、.config）。",
    },
    gitDecorations: {
      title: "Git 标记",
      description: "在文件管理器中高亮已修改的文件、淡化被 gitignore 的条目。",
    },
  },
  terminal: {
    label: "终端",
    renderer: {
      title: "终端渲染器",
      description:
        "自动模式优先使用 WebGPU，失败时回退 WebGL。如遇图形兼容性问题可选择 WebGL。对新终端生效。",
      auto: "自动",
    },
    screenReader: {
      title: "屏幕阅读器支持",
      description:
        "将终端输出暴露为无障碍文本。输出区域获得焦点时可用 Page Up 和 Page Down 浏览历史。",
    },
    cursorBlink: {
      title: "光标闪烁",
      description:
        "让终端光标闪烁。默认关闭以降低空闲 CPU 占用，与 VS Code 和 macOS 终端一致。",
    },
    cursorStyle: {
      title: "光标样式",
      description: "终端光标的形状。",
      bar: "竖线",
      block: "方块",
      underline: "下划线",
    },
    fontFamily: {
      title: "字体",
      description:
        '用于显示图标的 Nerd Font 名称（如 "CaskaydiaCove Nerd Font Mono"）。留空则自动检测。',
      placeholder: "自动检测",
    },
    fontWeight: {
      title: "字重",
      description: "终端字符的粗细",
      normal: "常规",
      medium: "中等",
      semiBold: "半粗",
      bold: "粗体",
    },
    shell: {
      title: "集成终端 Shell",
      descriptionUnintegrated: "此 Shell 不支持命令块和目录跟踪。",
      descriptionWsl:
        "集成终端使用的 Shell。WSL 空间使用发行版的登录 Shell。已有标签页保持原 Shell 不变。",
      descriptionDefault:
        "新终端标签页使用的 Shell。已有标签页保持原 Shell 不变。",
      auto: "自动",
    },
    workspaceEnv: {
      title: "工作区环境",
      description:
        "新空间运行的位置（终端和 AI 代理都生效）：Windows 或某个 WSL 发行版。已有空间保持不变；也可在状态栏随时切换。",
      windows: "Windows",
      unavailable: "{{name}}（不可用）",
    },
    letterSpacing: {
      title: "字符间距",
      description:
        "字符之间的额外水平间距（px）。使用 Nerd Fonts 时可设为负值收紧间距。",
    },
    fontSize: {
      title: "字号",
      description: "终端文字大小。",
    },
    scrollback: {
      title: "回滚行数",
      description:
        "每个终端保留的历史行数。数值越大占用内存越多（约 3 KB / 行）。",
      lines: "{{lines}} 行",
    },
    pathHistory: {
      title: "路径历史",
      description:
        "记录终端离开过的目录，供 Ctrl+E（最近路径）快速返回；Shift+点击路径可直接 cd 过去。",
      entries_one: "{{count}} 条",
      entries_other: "{{count}} 条",
    },
    confirmClose: {
      title: "终止运行中的进程前确认",
      description:
        "关闭终端标签页或退出应用时，如有命令仍在运行会先询问。未保存的编辑器修改始终需要确认。",
    },
  },
  agents: {
    label: "代理",
    displayMode: {
      title: "应用内通知显示方式",
      description: "直接显示消息，或只增加未读标记，打开通知后再查看消息。",
      toast: "直接显示消息",
      badge: "仅显示未读标记",
    },
    notifications: {
      title: "编码代理通知",
      description:
        "当编码代理需要你输入或任务完成时提醒你。Terax 窗口未聚焦时发送系统原生通知，否则在应用内提醒。",
    },
    sound: {
      title: "通知声音",
      description: "代理通知和应用内提醒时播放提示音。",
    },
    test: {
      waiting: "请切换应用…",
      sending: "发送中…",
      requested: "已请求",
      denied: "已被阻止",
      failed: "失败",
      idle: "2 秒后测试",
      titleWaiting: "切换到其他应用以验证原生通知送达",
      titleRequested: "已请求发送原生通知",
      titleDenied: "系统已禁用通知",
      titleFailed: "Terax 无法请求原生通知",
      titleIdle: "两秒后发送一条原生测试通知",
    },
  },
  startup: {
    label: "启动",
    launchAtLogin: {
      title: "登录时启动",
      description: "登录系统时自动打开 Terax。",
    },
    restoreWindow: {
      title: "恢复窗口位置和大小",
      description: "重新打开主窗口时恢复上次的位置。下次启动时生效。",
    },
  },
};
