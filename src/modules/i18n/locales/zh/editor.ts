import type { editor } from "../en/editor";

/** 编辑器：保存时格式化 toast、磁盘冲突、新建文件对话框、二进制/超大文件占位、AI/Git 差异视图、Markdown 预览提示。 */
export const editorZh: typeof editor = {
  format: {
    lspFailed: "语言服务器格式化失败",
    skipped: "已跳过保存时格式化",
    noLspFormatter:
      "当前语言服务器不支持格式化。请在设置中选择外部格式化工具（Python 用 Ruff、Prettier、rustfmt 等）。",
    noLsp:
      "此文件没有可用的语言服务器。请在状态栏中启用，或在设置中选择外部格式化工具。",
    failed: "{{formatter}} 格式化失败",
    noCustomCommand: "尚未在设置中配置自定义格式化命令。",
    timedOut: "{{formatter}} 执行超时",
    failedGeneric: "{{formatter}} 执行失败",
  },
  save: {
    conflictTitle: "文件已在磁盘上更改",
    conflictDescription:
      "在你有未保存的更改时，{{name}} 被其他程序修改。覆盖以保留你的版本。",
    overwrite: "覆盖",
  },
  dialog: {
    title: "新建文件",
    description: "文件名（相对于工作区根目录）。扩展名决定语言模式。",
    nameRequired: "需要填写名称",
    pathRelative: "路径必须是相对路径",
    noWorkspaceRoot: "没有工作区根目录",
    cancel: "取消",
    create: "创建",
  },
  media: {
    loading: "加载中…",
    binaryFile: "二进制文件",
    fileTooLarge: "文件过大",
    syntaxDisabled: "语法功能已禁用",
    previewNotSupported: "不支持预览",
    openAnyway: "仍然打开",
  },
  markdown: {
    saveToPreview: "保存后可预览",
  },
  aiDiff: {
    pending: "待审查",
    applied: "已应用",
    rejected: "已拒绝",
    newFile: "新文件",
    accept: "接受",
    reject: "拒绝",
  },
  gitDiff: {
    binaryFallback: "二进制 / 补丁回退",
    largeFileFallback: "大文件 / 补丁视图",
    loading: "正在加载差异…",
    unavailable: "此文件的差异预览不可用。",
  },
};
