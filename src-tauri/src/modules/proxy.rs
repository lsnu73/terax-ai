//! 代理软件的进程检测与自动启动。
//!
//! 前端在「已配置代理 + 任一场景启用 + 用户打开自动启动」时调用
//! `proxy_ensure_running`：软件已在运行则什么都不做，否则直接 spawn
//! 用户配置的可执行文件（不经过 shell，避免路径被当作命令解析）。

use std::path::Path;
use std::process::Command;

fn executable_name(path: &str) -> Result<String, String> {
    Path::new(path)
        .file_name()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("invalid proxy software path: {path}"))
}

#[cfg(windows)]
fn is_running(_path: &str, name: &str) -> bool {
    let mut cmd = Command::new("tasklist");
    cmd.args(["/FI", &format!("IMAGENAME eq {name}"), "/NH"]);
    crate::modules::proc::hide_console(&mut cmd);
    match cmd.output() {
        Ok(output) => String::from_utf8_lossy(&output.stdout)
            .to_ascii_lowercase()
            .contains(&name.to_ascii_lowercase()),
        Err(_) => false,
    }
}

#[cfg(not(windows))]
fn is_running(path: &str, _name: &str) -> bool {
    // 完整路径匹配命令行，避免误伤同名进程。
    Command::new("pgrep")
        .args(["-f", path])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// 返回是否真正启动了软件（已在运行时返回 `false`）。
#[tauri::command]
pub fn proxy_ensure_running(path: String) -> Result<bool, String> {
    let path = path.trim().to_string();
    let name = executable_name(&path)?;
    if is_running(&path, &name) {
        return Ok(false);
    }
    if !Path::new(&path).is_file() {
        return Err(format!("proxy software not found: {path}"));
    }
    let mut cmd = Command::new(&path);
    crate::modules::proc::hide_console(&mut cmd);
    cmd.spawn()
        .map_err(|e| format!("failed to launch {path}: {e}"))?;
    log::info!("proxy software auto-launched: {path}");
    Ok(true)
}
