/** 设置窗口 · 代理分区。 */
export const settingsProxy = {
  header: {
    title: "Proxy",
    description:
      "Route terminal, AI and updater traffic through a local HTTP proxy.",
  },
  server: {
    label: "Proxy server",
    host: "Host",
    hostPlaceholder: "localhost",
    port: "Port",
    portPlaceholder: "7890",
  },
  scenarios: {
    label: "Use proxy for",
    terminal: "Terminal",
    terminalDescription:
      "Applies to new terminals; for open ones, right-click the tab and choose Refresh. Commands run by AI also use this proxy and pick up changes on the next command—no session refresh needed (restart running background processes).",
    ai: "AI conversations",
    aiDescription:
      "Only model requests and streaming responses use this proxy; commands run by AI follow the Terminal proxy.",
    updater: "Updates",
    updaterDescription: "Update checks and downloads go through the proxy.",
    enableAll: "Enable all",
    disableAll: "Disable all",
  },
  software: {
    label: "Proxy software",
    path: "Executable path",
    pathPlaceholder: "Proxy software launch path",
    autoLaunch: "Launch automatically",
    autoLaunchDescription:
      "When a proxy is configured and enabled for any scenario, start the software if it is not running.",
    autoLaunchFailed: "Could not launch proxy software",
  },
};
