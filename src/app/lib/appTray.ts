import { t } from "@/modules/i18n";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Hides the main window behind a tray icon. Returns false when the platform
 * has no tray backend, so the caller can fall back to a real quit instead of
 * hiding a window the user cannot bring back.
 */
export async function minimizeToTray(): Promise<boolean> {
  try {
    await invoke("tray_show", {
      openLabel: t("app.tray.open"),
      quitLabel: t("app.tray.quit"),
    });
  } catch {
    return false;
  }
  try {
    await getCurrentWindow().hide();
    return true;
  } catch {
    void invoke("tray_hide");
    return false;
  }
}
