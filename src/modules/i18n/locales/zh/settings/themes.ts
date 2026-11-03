import type { settingsThemes } from "../../en/settings/themes";

/** 设置窗口 · Themes 区块。 */
export const settingsThemesZh: typeof settingsThemes = {
  header: {
    title: "主题",
    description: "主题、背景图片与个性化。",
  },
  backdrop: {
    mica: {
      title: "Mica 背景",
      description: "将标题栏、状态栏与侧边栏融入桌面壁纸。仅限 Windows 11。",
    },
    vibrancy: {
      title: "窗口虚化",
      description:
        "标题栏、状态栏与侧边栏对窗口背后的内容做磨砂效果。面板保持不透明。",
    },
  },
  theme: {
    label: "主题",
    create: "新建",
    import: "导入 .terax-theme",
    editAria: "编辑 {{name}}",
    removeAria: "删除 {{name}}",
    errorRead: "读取失败",
  },
  editorTheme: {
    label: "编辑器主题",
    hint: "代码编辑器的语法配色。自动模式跟随应用主题。",
    auto: "自动（跟随应用主题）",
  },
  background: {
    label: "背景",
    remove: "移除",
    replaceImage: "替换图片",
    chooseImage: "选择图片",
    opacity: "不透明度",
    blur: "模糊",
    hint: "把图片拖到这里，或点击选择。图片保存在本地；设置前不影响默认外观。",
    errorNotImage: "{{file}}：不是图片",
    errorImport: "导入图片失败",
  },
};
