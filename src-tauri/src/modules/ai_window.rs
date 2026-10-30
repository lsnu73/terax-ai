use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const AI_WINDOW_LABEL: &str = "ai";

fn build_window(app: &AppHandle) -> Result<(), String> {
    let builder =
        WebviewWindowBuilder::new(app, AI_WINDOW_LABEL, WebviewUrl::App("ai.html".into()))
            .title("Terax AI")
            .inner_size(520.0, 700.0)
            .min_inner_size(380.0, 460.0)
            .resizable(true)
            .visible(false)
            // AI 窗口是主窗口的附属面板：不占任务栏条目，Windows 任务栏
            // 只保留主窗口一个 Terax 图标（macOS 忽略该标志）。
            .skip_taskbar(true);

    // 挂到主窗口下成为 owned 窗口（与 Settings 窗口同策略）：owned 窗口
    // 始终保持在主窗口之上、不被主窗口遮挡，但仍是普通层级 —— 切换到
    // 其他应用时会正常后退，不会浮在其他软件上面。切勿再叠加
    // always_on_top（macOS 上与 parent 组合会破坏 WebView 合成）。
    let builder = if let Some(main) = app.get_webview_window("main") {
        builder.parent(&main).map_err(|e| e.to_string())?
    } else {
        builder
    };

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
