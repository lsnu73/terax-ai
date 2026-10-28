import type { settingsLsp } from "../../en/settings/lsp";

/** 设置窗口 · Editor 区块内的语言服务器（LSP）部分。 */
export const settingsLspZh: typeof settingsLsp = {
  label: "语言服务器",
  server: {
    checking: "检测中…",
    notFound: "未在 PATH 中找到",
    detectAgain: "重新检测",
    remove: "移除服务器",
    switchEnableAria: "启用 {{name}} 语言服务器",
    switchDisableAria: "禁用 {{name}} 语言服务器",
  },
  addCustom: "添加自定义服务器",
  customDialog: {
    title: "自定义语言服务器",
    name: "名称",
    command: "命令",
    arguments: "参数",
    fileExtensions: "文件扩展名",
    languageId: "LSP 语言 ID",
    rootMarkers: "根目录标记",
    add: "添加服务器",
  },
  install: {
    title: "安装 {{name}} 语言服务器",
    notFoundPre: "Terax 在你的 PATH 中找不到",
    notFoundPost: "。安装后点击重新检测以启用此语言服务器。",
    copyCommand: "复制安装命令",
    manualHint: "请手动安装此自定义服务器，并确保其命令在 PATH 中可用。",
    stillNotFound: "仍未找到。请完成安装，并确保命令在 PATH 中可用。",
    documentation: "文档",
    checking: "检测中…",
    checkAgain: "重新检测",
  },
};
