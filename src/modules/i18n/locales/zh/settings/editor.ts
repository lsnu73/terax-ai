import type { settingsEditor } from "../../en/settings/editor";

/** 设置窗口 · Editor 区块。 */
export const settingsEditorZh: typeof settingsEditor = {
  header: {
    title: "编辑器",
    description: "编辑行为、保存与语言服务器。",
  },
  appearance: {
    label: "外观",
    fontSize: {
      title: "字号",
      description: "代码编辑器文字大小。",
    },
  },
  editing: {
    label: "编辑",
    vim: {
      title: "Vim 模式",
      description: "在代码编辑器中启用 Vim 键位。",
    },
    wordWrap: {
      title: "自动换行",
      description: "长行自动换行，而不是横向滚动。",
    },
    wrapColumn: {
      title: "换行列宽",
      description: "在此列处软换行；编辑器更窄时会提前换行。",
      unit: "列",
    },
  },
  saving: {
    label: "保存",
    autoSave: {
      title: "自动保存",
      description: "检测到修改后，延迟自动保存文件。",
    },
    autoSaveDelay: {
      title: "自动保存延迟",
      description: "未保存的修改被自动保存前的等待时间。",
    },
    formatOnSave: {
      title: "保存时格式化",
      description: "显式保存（Cmd+S / :w）时用下方指定的格式化工具格式化文件。",
    },
    formatter: {
      title: "格式化工具",
      description:
        "语言服务器在写入前格式化缓冲区；外部工具在保存后的文件上运行，需在你的 PATH 中。",
      lsp: "语言服务器",
      custom: "自定义命令",
    },
    customCommand: {
      title: "自定义命令",
      description:
        "在保存后的文件上运行；{file} 会被替换为带引号的路径（省略时自动追加）。",
    },
    overrides: {
      title: "按语言覆盖",
      description: "为特定语言使用不同的格式化工具（如 Python 用 Ruff）。",
      add: "添加覆盖",
      remove: "删除覆盖",
    },
  },
};
