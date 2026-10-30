use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const AI_WINDOW_LABEL: &str = "ai";

fn build_window(app: &AppHandle) -> Result<(), String> {
    let builder =
        WebviewWindowBuilder::new(app, AI_WINDOW_LABEL, WebviewUrl::App("ai.html".into()))
            .title("Terax AI")
            .inner_size(520.0, 700.0)
            .min_inner_size(380.0, 460.0)
            .resizable(true)
            .visible(false);

    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);

    #[cfg(any(target_os = "linux", target_os = "windows"))]
    let builder = builder.decorations(false).transparent(true);

    #[cfg_attr(windows, allow(unused_variables))]
    let window = builder.build().map_err(|error| error.to_string())?;

    #[cfg(target_os = "linux")]
    let _ = window.set_decorations(false);

    let _ = window.center();
    Ok(())
}

#[tauri::command]
pub async fn open_ai_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(AI_WINDOW_LABEL) {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }
    build_window(&app)
}

#[tauri::command]
pub async fn close_ai_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(AI_WINDOW_LABEL) {
        window.destroy().map_err(|error| error.to_string())?;
    }
    Ok(())
}
