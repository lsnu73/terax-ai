import "../styles/globals.css";

import { disableNativeContextMenu } from "@/lib/disableNativeContextMenu";
import { USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { initI18n } from "@/modules/i18n";
import { ThemeProvider } from "@/modules/theme";
import { getCurrentWindow } from "@tauri-apps/api/window";
import ReactDOM from "react-dom/client";
import { AiWindowApp } from "./AiWindowApp";

if (USE_CUSTOM_WINDOW_CONTROLS) {
  document.documentElement.dataset.chrome = "borderless";
}

disableNativeContextMenu();

await initI18n();

ReactDOM.createRoot(document.getElementById("ai-root") as HTMLElement).render(
  <ThemeProvider>
    <AiWindowApp />
  </ThemeProvider>,
);

const showWindow = () => {
  getCurrentWindow()
    .show()
    .catch((error) => console.error("ai window show failed:", error));
};
setTimeout(showWindow, 50);
setTimeout(showWindow, 500);
