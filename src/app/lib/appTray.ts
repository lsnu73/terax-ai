import { t } from "@/modules/i18n";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export async function ensureTray(): Promise<void> {
  await invoke("tray_show", {
    openLabel: t("app.tray.open"),
    quitLabel: t("app.tray.quit"),
  });
}

/**
 * Hides the main window behind the resident tray icon. Returns false when the
 * platform has no tray backend, so the caller can fall back to a real quit.
 */
export async function minimizeToTray(): Promise<boolean> {
  try {
    await ensureTray();
  } catch {
    return false;
  }
  try {
    await getCurrentWindow().hide();
    return true;
  } catch {
    return false;
  }
}
