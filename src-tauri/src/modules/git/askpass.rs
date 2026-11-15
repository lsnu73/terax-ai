//! SSH askpass helper for passphrase-protected keys.
//!
//! Terax spawns git without a TTY and with prompts disabled, so ssh can never
//! ask for an encrypted key's passphrase interactively. For a push that failed
//! SSH authentication we retry with an askpass helper: a throwaway script that
//! prints the passphrase the user typed in the dialog. The secret travels via
//! the `TERAX_SSH_PASSPHRASE` environment variable instead of argv, and the
//! script file is removed when the guard drops.
//!
//! `SSH_ASKPASS_REQUIRE=force` (OpenSSH >= 8.4) selects askpass outright; the
//! dummy `DISPLAY` covers older builds that only need it set. The `.cmd`
//! flavor works with Git for Windows' bundled ssh (verified with ssh-add on an
//! encrypted key); WSL relies on `WSLENV` flags to forward the values and
//! translate the askpass path.

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::modules::git::errors::{GitError, Result};
use crate::modules::workspace::WorkspaceEnv;

const PASSPHRASE_ENV: &str = "TERAX_SSH_PASSPHRASE";
static ASKPASS_SEQ: AtomicU64 = AtomicU64::new(0);

pub struct SshAskpass {
    path: PathBuf,
    envs: Vec<(String, String)>,
}

impl SshAskpass {
    /// Writes the askpass script for `workspace` and returns the guard plus
    /// the env entries to layer onto the git command.
    pub fn create(passphrase: &str, workspace: &WorkspaceEnv) -> Result<Self> {
        if passphrase.is_empty() {
            return Err(GitError::command("git push failed", "empty passphrase"));
        }
        let wsl = matches!(workspace, WorkspaceEnv::Wsl { .. });
        let (script, windows_path) = write_script(wsl)?;
        let mut envs = vec![
            ("SSH_ASKPASS_REQUIRE".to_string(), "force".to_string()),
            ("DISPLAY".to_string(), "dummy:0".to_string()),
            (PASSPHRASE_ENV.to_string(), passphrase.to_string()),
        ];
        if wsl {
            envs.push(("SSH_ASKPASS".to_string(), windows_path.clone()));
            envs.push(("WSLENV".to_string(), wsl_env()));
        } else {
            envs.push(("SSH_ASKPASS".to_string(), windows_path));
        }
        Ok(Self { path: script, envs })
    }

    pub fn envs(&self) -> &[(String, String)] {
        &self.envs
    }
}

impl Drop for SshAskpass {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

fn write_script(wsl: bool) -> Result<(PathBuf, String)> {
    let dir = std::env::temp_dir();
    let name = format!(
        "terax-askpass-{}-{}.{}",
        std::process::id(),
        ASKPASS_SEQ.fetch_add(1, Ordering::Relaxed),
        if wsl || !cfg!(windows) { "sh" } else { "cmd" },
    );
    let path = dir.join(name);
    let body = if wsl || !cfg!(windows) {
        "#!/bin/sh\nprintf '%s\\n' \"$TERAX_SSH_PASSPHRASE\"\n"
    } else {
        "@echo %TERAX_SSH_PASSPHRASE%\n"
    };
    fs::write(&path, body).map_err(GitError::Io)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o700));
    }
    let display = path.to_string_lossy().into_owned();
    Ok((path, display))
}

/// WSLENV tokens that forward the askpass values into the distro. The `/up`
/// flags on SSH_ASKPASS make wsl.exe translate the Windows script path to its
/// `/mnt/...` form; the rest are plain pass-through, Win->WSL only.
fn wsl_env() -> String {
    const TOKENS: &str = "SSH_ASKPASS/up:SSH_ASKPASS_REQUIRE/u:DISPLAY/u:TERAX_SSH_PASSPHRASE/u";
    let existing = std::env::var("WSLENV").unwrap_or_default();
    if existing.is_empty() {
        TOKENS.to_string()
    } else {
        format!("{existing}:{TOKENS}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_cmd_script_with_env_for_local_windows() {
        let guard = SshAskpass::create("secret", &WorkspaceEnv::Local).expect("askpass created");
        let envs = guard.envs();
        let askpass = envs
            .iter()
            .find(|(k, _)| k == "SSH_ASKPASS")
            .map(|(_, v)| v)
            .expect("SSH_ASKPASS");
        if cfg!(windows) {
            assert!(askpass.ends_with(".cmd"));
            let body = fs::read_to_string(&guard.path).expect("script readable");
            assert_eq!(body, "@echo %TERAX_SSH_PASSPHRASE%\n");
        } else {
            assert!(askpass.ends_with(".sh"));
        }
        assert!(envs.contains(&("SSH_ASKPASS_REQUIRE".into(), "force".into())));
        assert!(envs.contains(&(PASSPHRASE_ENV.into(), "secret".into())));
        assert!(envs.iter().any(|(k, _)| k == "DISPLAY"));
        let path = guard.path.clone();
        drop(guard);
        assert!(!path.exists());
    }

    #[test]
    fn rejects_empty_passphrase() {
        assert!(SshAskpass::create("", &WorkspaceEnv::Local).is_err());
    }

    #[cfg(windows)]
    #[test]
    fn wsl_uses_sh_script_and_wslenv_flags() {
        let workspace = WorkspaceEnv::Wsl {
            distro: "Ubuntu".into(),
        };
        let guard = SshAskpass::create("secret", &workspace).expect("askpass created");
        assert!(guard.path.to_string_lossy().ends_with(".sh"));
        let envs = guard.envs();
        let wslenv = envs
            .iter()
            .find(|(k, _)| k == "WSLENV")
            .map(|(_, v)| v)
            .expect("WSLENV");
        assert!(wslenv.contains("SSH_ASKPASS/up"));
        assert!(wslenv.contains("TERAX_SSH_PASSPHRASE/u"));
        let body = fs::read_to_string(&guard.path).expect("script readable");
        assert!(body.starts_with("#!/bin/sh"));
        let path = guard.path.clone();
        drop(guard);
        assert!(!path.exists());
    }
}
