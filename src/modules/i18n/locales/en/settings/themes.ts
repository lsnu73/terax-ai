/** 设置窗口 · Themes 区块。 */
export const settingsThemes = {
  header: {
    title: "Themes",
    description: "Theme, background image, and customization.",
  },
  backdrop: {
    mica: {
      title: "Mica background",
      description:
        "Blend the header, status bar and gutters into the desktop wallpaper. Windows 11 only.",
    },
    vibrancy: {
      title: "Window vibrancy",
      description:
        "Frost the header, status bar and gutters over what is behind the window. Panes stay solid.",
    },
  },
  theme: {
    label: "Theme",
    create: "Create",
    import: "Import .terax-theme",
    editAria: "Edit {{name}}",
    removeAria: "Remove {{name}}",
    errorRead: "failed to read",
  },
  editorTheme: {
    label: "Editor theme",
    hint: "Syntax colors for the code editor. Auto follows the app theme.",
    auto: "Auto (match app theme)",
  },
  background: {
    label: "Background",
    remove: "Remove",
    replaceImage: "Replace image",
    chooseImage: "Choose image",
    opacity: "Opacity",
    blur: "Blur",
    hint: "Drop an image here or pick one. Stored locally; doesn't affect the default look until set.",
    errorNotImage: "{{file}}: not an image",
    errorImport: "failed to import image",
  },
};
