/**
 * 设置页在主窗口以 tab 形式打开。tab 系统归 App/useTabs 所有，
 * 深层组件（模型选择器、Agent 切换器等）通过这个注册表间接调用，
 * 避免 tab 状态层层透传。
 */
export type SettingsTab =
  | "general"
  | "editor"
  | "themes"
  | "shortcuts"
  | "models"
  | "agents"
  | "proxy"
  | "about";

type Opener = (tab?: SettingsTab) => void;

let opener: Opener | null = null;

export function registerSettingsOpener(fn: Opener | null): void {
  opener = fn;
}

export function openSettings(tab?: SettingsTab): void {
  if (!opener) {
    console.warn("openSettings: settings tab opener is not registered yet");
    return;
  }
  opener(tab);
}
