//! 代理软件的进程检测与自动启动。
//!
//! 前端在「已配置代理 + 任一场景启用 + 用户打开自动启动」时调用
//! `proxy_ensure_running`：软件已在运行则什么都不做，否则启动用户配置的
//! 可执行文件（不经过 shell，避免路径被当作命令解析）。Windows 仅在错误
//! 740 时通过 `runas` 请求提升权限。

use std::path::Path;
use std::process::Command;

#[cfg(windows)]
use std::io;

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

#[cfg(windows)]
fn launch_with_elevation_fallback(
    launch: impl FnOnce() -> io::Result<()>,
    launch_elevated: impl FnOnce() -> io::Result<()>,
) -> io::Result<()> {
    use windows_sys::Win32::Foundation::ERROR_ELEVATION_REQUIRED;

    match launch() {
        Err(error) if error.raw_os_error() == Some(ERROR_ELEVATION_REQUIRED as i32) => {
            launch_elevated()
        }
        result => result,
    }
}

#[cfg(windows)]
fn launch_elevated(path: &str) -> io::Result<()> {
    use std::ffi::OsStr;
    use std::mem::{size_of, zeroed};
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::{ShellExecuteExW, SHELLEXECUTEINFOW};
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let verb: Vec<u16> = OsStr::new("runas").encode_wide().chain(Some(0)).collect();
    let file: Vec<u16> = Path::new(path)
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    let mut info: SHELLEXECUTEINFOW = unsafe { zeroed() };
    info.cbSize = size_of::<SHELLEXECUTEINFOW>() as u32;
    info.lpVerb = verb.as_ptr();
    info.lpFile = file.as_ptr();
    info.nShow = SW_SHOWNORMAL;

    if unsafe { ShellExecuteExW(&mut info) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

#[cfg(windows)]
fn launch(path: &str) -> io::Result<()> {
    let mut cmd = Command::new(path);
    crate::modules::proc::hide_console(&mut cmd);
    launch_with_elevation_fallback(|| cmd.spawn().map(|_| ()), || launch_elevated(path))
}

#[cfg(not(windows))]
fn launch(path: &str) -> std::io::Result<()> {
    let mut cmd = Command::new(path);
    crate::modules::proc::hide_console(&mut cmd);
    cmd.spawn().map(|_| ())
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
    launch(&path).map_err(|e| format!("failed to launch {path}: {e}"))?;
    log::info!("proxy software auto-launched: {path}");
    Ok(true)
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[test]
    fn successful_normal_launch_skips_elevation() {
        let elevated_calls = Cell::new(0);
        let result = launch_with_elevation_fallback(
            || Ok(()),
            || {
                elevated_calls.set(elevated_calls.get() + 1);
                Ok(())
            },
        );

        assert!(result.is_ok());
        assert_eq!(elevated_calls.get(), 0);
    }

    #[test]
    fn elevation_required_retries_once_with_runas() {
        let elevated_calls = Cell::new(0);
        let result = launch_with_elevation_fallback(
            || Err(io::Error::from_raw_os_error(740)),
            || {
                elevated_calls.set(elevated_calls.get() + 1);
                Ok(())
            },
        );

        assert!(result.is_ok());
        assert_eq!(elevated_calls.get(), 1);
    }

    #[test]
    fn other_launch_errors_do_not_elevate() {
        let elevated_calls = Cell::new(0);
        let result = launch_with_elevation_fallback(
            || Err(io::Error::from_raw_os_error(5)),
            || {
                elevated_calls.set(elevated_calls.get() + 1);
                Ok(())
            },
        );

        assert_eq!(result.unwrap_err().raw_os_error(), Some(5));
        assert_eq!(elevated_calls.get(), 0);
    }

    #[test]
    fn elevated_launch_failure_is_returned() {
        let result = launch_with_elevation_fallback(
            || Err(io::Error::from_raw_os_error(740)),
            || Err(io::Error::from_raw_os_error(1223)),
        );

        assert_eq!(result.unwrap_err().raw_os_error(), Some(1223));
    }
}
