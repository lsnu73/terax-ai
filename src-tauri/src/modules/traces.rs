//! Every place Terax leaves state on this machine, listed in Settings > About.
//!
//! Only paths this app computes are reported, never user input, and the
//! command never changes anything.

use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct AppTrace {
    pub id: &'static str,
    /// Grouping for the UI: data | config | cache | logs | install | registry | credentials.
    pub kind: &'static str,
    pub value: String,
    pub exists: bool,
}

fn push_path(
    out: &mut Vec<AppTrace>,
    id: &'static str,
    kind: &'static str,
    path: Option<PathBuf>,
) {
    let Some(path) = path else { return };
    let exists = path.exists();
    out.push(AppTrace {
        id,
        kind,
        value: path.display().to_string(),
        exists,
    });
}

fn push_value(
    out: &mut Vec<AppTrace>,
    id: &'static str,
    kind: &'static str,
    value: String,
    exists: bool,
) {
    out.push(AppTrace {
        id,
        kind,
        value,
        exists,
    });
}

#[cfg(windows)]
fn run_key_lists_terax() -> bool {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
    use winreg::RegKey;

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let Ok(key) = RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(RUN_KEY, KEY_READ) else {
        return false;
    };
    key.enum_values().filter_map(Result::ok).any(|(name, value)| {
        name.to_ascii_lowercase().contains("terax")
            || value.to_string().to_ascii_lowercase().contains("terax")
    })
}

#[cfg(windows)]
fn reg_key_exists(root: winreg::HKEY, path: &str) -> bool {
    winreg::RegKey::predef(root)
        .open_subkey_with_flags(path, winreg::enums::KEY_READ)
        .is_ok()
}

#[cfg(windows)]
fn windows_traces(out: &mut Vec<AppTrace>, local: Option<&Path>) {
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};

    push_path(
        out,
        "webview-data",
        "data",
        local.map(|dir| dir.join("EBWebView")),
    );
    push_path(
        out,
        "start-menu-shortcut",
        "install",
        dirs::data_dir().map(|dir| dir.join(r"Microsoft\Windows\Start Menu\Programs\Terax.lnk")),
    );
    push_path(
        out,
        "desktop-shortcut",
        "install",
        dirs::desktop_dir().map(|dir| dir.join("Terax.lnk")),
    );

    push_value(
        out,
        "registry-autostart",
        "registry",
        r"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run".into(),
        run_key_lists_terax(),
    );
    // NSIS registers the uninstall entry under the product name.
    const UNINSTALL_CANDIDATES: [&str; 2] = [
        r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Terax",
        r"Software\Microsoft\Windows\CurrentVersion\Uninstall\app.wang.terax",
    ];
    let installed = UNINSTALL_CANDIDATES
        .iter()
        .find(|key| reg_key_exists(HKEY_CURRENT_USER, key) || reg_key_exists(HKEY_LOCAL_MACHINE, key));
    push_value(
        out,
        "registry-uninstall",
        "registry",
        format!(
            r"HKEY_CURRENT_USER\{}",
            installed.unwrap_or(&UNINSTALL_CANDIDATES[0])
        ),
        installed.is_some(),
    );
    push_value(
        out,
        "credentials",
        "credentials",
        "Windows Credential Manager · terax-ai".into(),
        true,
    );
}

#[cfg(target_os = "macos")]
fn macos_traces(out: &mut Vec<AppTrace>) {
    push_value(
        out,
        "credentials",
        "credentials",
        "macOS Keychain · terax-ai".into(),
        true,
    );
}

#[cfg(target_os = "linux")]
fn linux_traces(out: &mut Vec<AppTrace>, local: Option<&Path>) {
    push_path(
        out,
        "credentials",
        "credentials",
        local.map(|dir| dir.join("secrets.json")),
    );
}

#[tauri::command]
pub async fn app_traces(app: AppHandle) -> Result<Vec<AppTrace>, String> {
    let path = app.path();
    let data = path.app_data_dir().ok();
    let config = path.app_config_dir().ok();
    let local = path.app_local_data_dir().ok();
    let cache = path.app_cache_dir().ok();
    let logs = path.app_log_dir().ok();
    // The existence checks hit the disk, so they run off the main thread.
    crate::modules::fs::blocking(move || {
        Ok(collect(data, config, local, cache, logs))
    })
    .await
}

fn collect(
    data: Option<PathBuf>,
    config: Option<PathBuf>,
    local: Option<PathBuf>,
    cache: Option<PathBuf>,
    logs: Option<PathBuf>,
) -> Vec<AppTrace> {
    let mut out = Vec::new();
    let exe = std::env::current_exe().ok();
    push_path(
        &mut out,
        "install-dir",
        "install",
        exe.as_deref().and_then(Path::parent).map(Path::to_path_buf),
    );
    push_path(&mut out, "exe", "install", exe);
    push_path(&mut out, "app-data", "data", data.clone());
    push_path(&mut out, "app-config", "config", config.clone());
    push_path(&mut out, "app-local-data", "data", local.clone());
    push_path(&mut out, "app-cache", "cache", cache);
    push_path(&mut out, "app-logs", "logs", logs);
    push_path(
        &mut out,
        "settings",
        "config",
        config.as_ref().map(|dir| dir.join("terax-settings.json")),
    );
    push_path(
        &mut out,
        "models",
        "config",
        config.as_ref().map(|dir| dir.join("terax-ai-models.json")),
    );
    push_path(
        &mut out,
        "sessions",
        "data",
        data.as_ref().map(|dir| dir.join("terax-ai-sessions.json")),
    );
    push_path(
        &mut out,
        "conversations",
        "data",
        data.as_ref().map(|dir| dir.join("conversations")),
    );

    #[cfg(windows)]
    windows_traces(&mut out, local.as_deref());
    #[cfg(target_os = "macos")]
    macos_traces(&mut out);
    #[cfg(target_os = "linux")]
    linux_traces(&mut out, local.as_deref());

    out
}
