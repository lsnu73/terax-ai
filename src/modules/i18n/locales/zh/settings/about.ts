import type { settingsAbout } from "../../en/settings/about";

/** 设置窗口 · About 区块。 */
export const settingsAboutZh: typeof settingsAbout = {
  header: {
    title: "关于",
  },
  tagline: "开源的 AI 原生终端模拟器",
  build: "构建",
  bundleId: "包标识",
  license: "许可证",
  sourceCode: "源代码",
  website: "官网",
  viewOnGitHub: "在 GitHub 查看",
  reportIssue: "报告问题",
  update: {
    upToDate: "已是最新版本",
    checkFailed: "检查失败 — 重试",
    checking: "检查中…",
    downloading: "下载中…",
    restartToInstall: "重启以安装",
    installVersion: "安装 v{{version}}",
    updateToVersion: "更新到 v{{version}}",
    checkForUpdates: "检查更新",
  },
};
