//! Tray icon for the hidden main window.
//!
//! Created the first time the window hides to the tray and kept for the rest
//! of the session: left click brings the window back, right click offers
//! "open" and "quit". Linux has no tray backend in this build, so the
//! frontend falls back to quitting when creation fails.

use tauri::{AppHandle, Manager};

/// Brings the main window back on every surface that can reach a running
/// instance: the tray icon and menu, a second launch, the macOS dock.
pub fn reveal_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
mod platform {
    use super::*;
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    const TRAY_ID: &str = "terax-tray";
    const MENU_OPEN: &str = "terax-tray-open";
    const MENU_QUIT: &str = "terax-tray-quit";

    pub fn show(app: &AppHandle, open_label: &str, quit_label: &str) -> Result<(), String> {
        if app.tray_by_id(TRAY_ID).is_some() {
            return Ok(());
        }
        let open = MenuItem::with_id(app, MENU_OPEN, open_label, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let quit = MenuItem::with_id(app, MENU_QUIT, quit_label, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let menu = Menu::with_items(app, &[&open, &quit]).map_err(|e| e.to_string())?;
        let mut builder = TrayIconBuilder::with_id(TRAY_ID)
            .tooltip("Terax")
            .menu(&menu)
            // Right click opens the menu, left click brings the window back.
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| match event.id().as_ref() {
                MENU_OPEN => reveal(app),
                MENU_QUIT => app.exit(0),
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    reveal(tray.app_handle());
                }
            });
        if let Some(icon) = app.default_window_icon().cloned() {
            builder = builder.icon(icon);
        }
        builder.build(app).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn hide(app: &AppHandle) {
        app.remove_tray_by_id(TRAY_ID);
    }

    fn reveal(app: &AppHandle) {
        reveal_main_window(app);
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod platform {
    use super::*;

    pub fn show(_app: &AppHandle, _open_label: &str, _quit_label: &str) -> Result<(), String> {
        Err("the tray is unavailable on this platform".into())
    }

    pub fn hide(_app: &AppHandle) {}
}

#[tauri::command]
pub fn tray_show(
    app: AppHandle,
    open_label: String,
    quit_label: String,
) -> Result<(), String> {
    platform::show(&app, &open_label, &quit_label)
}

#[tauri::command]
pub fn tray_hide(app: AppHandle) {
    platform::hide(&app);
}
