import "../styles/globals.css";

import { disableNativeContextMenu } from "@/lib/disableNativeContextMenu";
import { USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { initI18n } from "@/modules/i18n";
import { ThemeProvider } from "@/modules/theme";
import { getCurrentWindow } from "@tauri-apps/api/window";
import ReactDOM from "react-dom/client";
import { SettingsApp } from "./SettingsApp";

if (USE_CUSTOM_WINDOW_CONTROLS) {
  document.documentElement.dataset.chrome = "borderless";
}

disableNativeContextMenu();

// i18n must be ready before first render: useTranslation suspends otherwise.
await initI18n();

ReactDOM.createRoot(
  document.getElementById("settings-root") as HTMLElement,
).render(
  <ThemeProvider>
    <SettingsApp />
  </ThemeProvider>,
);

const showWindow = () => {
  getCurrentWindow()
    .show()
    .catch((e) => console.error("settings show failed:", e));
};
setTimeout(showWindow, 50);
setTimeout(showWindow, 500);
