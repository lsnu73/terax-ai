import type { preview } from "../en/preview";

/** 预览面板：地址栏、端口预设菜单（预设名不翻译）、提示条、挂起与空态。 */
export const previewZh: typeof preview = {
  reload: "重新加载",
  portsTitle: "常用开发服务器端口",
  ports: "端口",
  checking: "检查中…",
  openInSystemBrowser: "在系统浏览器中打开",
  noticeEnterUrl: "输入 URL 或选择一个端口预设。",
  noticeNoServer: "端口 :{{port}} 上没有服务器在监听。",
  dismiss: "关闭",
  xfoHint:
    "许多公共网站拒绝被嵌入（X-Frame-Options）。如果页面空白，请在外部打开。",
  cookieHintTitle: "基于 Cookie 的登录在沙盒预览中可能无法使用。",
  cookieHint: "基于 Cookie 的登录在预览中可能无法使用。",
  openInBrowser: "在浏览器中打开",
  dismissCookieNotice: "关闭 Cookie 登录提示",
  iframeTitle: "预览",
  suspendedTitle: "预览已挂起",
  suspendedDescription: "因长时间处于后台，已释放以节省内存。",
  emptyTitle: "还没有可预览的内容",
  emptyDescriptionPre: "在上方输入 URL，或打开",
  emptyDescriptionPost:
    "下拉菜单，直接跳转到你正在运行的开发服务器。公共网站通常会阻止嵌入；如果看到空白页，请通过链接图标在浏览器中打开。",
};
