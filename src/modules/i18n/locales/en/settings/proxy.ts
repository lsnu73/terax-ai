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
      "Sets HTTP(S)_PROXY for newly opened terminals; running shells are unaffected.",
    ai: "AI conversations",
    aiDescription: "Model requests and streaming responses go through the proxy.",
    updater: "Updates",
    updaterDescription: "Update checks and downloads go through the proxy.",
    enableAll: "Enable all",
    disableAll: "Disable all",
  },
  software: {
    label: "Proxy software",
    path: "Executable path",
    pathPlaceholder: "e.g. C:\\Tools\\Clash\\clash-verge.exe",
    autoLaunch: "Launch automatically",
    autoLaunchDescription:
      "When a proxy is configured and enabled for any scenario, start the software if it is not running.",
  },
};
