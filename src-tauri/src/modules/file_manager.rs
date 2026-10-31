//! Opening a folder in the file manager the user actually uses.
//!
//! Windows has no single "open this folder in my file manager" API. The
//! `opener` plugin delegates to the `open` crate, which short-circuits
//! directories into Explorer (`SHOpenFolderAndSelectItems`), and ShellExecute's
//! `explore` verb is hardwired to Explorer too. Instead we resolve the handler
//! registered for the `Directory` / `Folder` shell classes, prefer a
//! third-party manager when one is the default or is installed, and only fall
//! back to Explorer when none is found.

use std::path::Path;

/// Opens the app data directory, where `terax-ai-models.json` lives.
///
/// The path is computed here rather than passed from the webview, so this
/// command cannot be used to open arbitrary locations. For user-initiated
/// opens (terminal path links) see [`open_path_in_file_manager`].
#[tauri::command]
pub fn open_ai_config_dir(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("failed to create config dir: {e}"))?;
    open_dir(&dir)
}

/// Opens a location the user clicked in the terminal (Ctrl+click on an
/// absolute path). Directories open as-is; files open their parent folder.
/// The path must exist on disk, so a mistyped shell token can't spawn a
/// file manager window.
#[tauri::command]
pub fn open_path_in_file_manager(path: String) -> Result<(), String> {
    let clicked = Path::new(&path);
    let target = if clicked.is_dir() {
        clicked
    } else if clicked.is_file() {
        clicked.parent().unwrap_or_else(|| Path::new("/"))
    } else {
        return Err(format!("path does not exist: {path}"));
    };
    if !target.exists() {
        return Err(format!("path does not exist: {path}"));
    }
    open_dir(target)
}

#[cfg(windows)]
pub fn open_dir(dir: &Path) -> Result<(), String> {
    windows::open(dir)
}

#[cfg(target_os = "macos")]
pub fn open_dir(dir: &Path) -> Result<(), String> {
    spawn_detached(Path::new("open"), &[dir.to_string_lossy().into_owned()])
}

#[cfg(all(
    unix,
    not(any(target_os = "macos", target_os = "android", target_os = "ios"))
))]
pub fn open_dir(dir: &Path) -> Result<(), String> {
    spawn_detached(Path::new("xdg-open"), &[dir.to_string_lossy().into_owned()])
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn open_dir(_dir: &Path) -> Result<(), String> {
    Err("opening folders is unsupported on this platform".into())
}

#[cfg(not(any(windows, unix)))]
pub fn open_dir(_dir: &Path) -> Result<(), String> {
    Err("opening folders is unsupported on this platform".into())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn spawn_detached(program: &Path, args: &[String]) -> Result<(), String> {
    let mut command = std::process::Command::new(program);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("failed to launch {}: {e}", program.display()))
}

#[cfg(windows)]
mod windows {
    use super::spawn_detached;
    use std::path::{Path, PathBuf};
    use winreg::enums::{HKEY_CLASSES_ROOT, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
    use winreg::RegKey;

    /// Shell classes Windows consults for a file-system directory, in order.
    const DIRECTORY_CLASSES: [&str; 2] = ["Directory", "Folder"];

    /// Shell verbs that substitute the clicked folder instead of `%1`.
    const FOLDER_PLACEHOLDERS: [char; 7] = ['1', 'l', 'L', 'v', 'V', 'd', 'D'];

    pub fn open(dir: &Path) -> Result<(), String> {
        if let Some(handler) = registered_handler() {
            if !handler.is_explorer() && spawn_detached(&handler.program, &handler.args_for(dir)).is_ok() {
                return Ok(());
            }
        }

        for (program, args) in installed_managers(dir) {
            if spawn_detached(&program, &args).is_ok() {
                return Ok(());
            }
        }

        let dir_arg = dir.to_string_lossy().into_owned();
        spawn_detached(Path::new("explorer.exe"), &[dir_arg])
            .map_err(|e| format!("failed to open {}: {e}", dir.display()))
    }

    struct ShellCommand {
        program: PathBuf,
        args: Vec<String>,
    }

    impl ShellCommand {
        fn is_explorer(&self) -> bool {
            self.program
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.eq_ignore_ascii_case("explorer.exe"))
        }

        /// Substitutes the folder for `%1`-style placeholders. A command without
        /// any placeholder (Explorer's own registration) gets the folder appended.
        fn args_for(&self, dir: &Path) -> Vec<String> {
            let dir = dir.to_string_lossy();
            let mut args = Vec::with_capacity(self.args.len() + 1);
            let mut substituted = false;
            for arg in &self.args {
                match substitute_placeholders(arg, &dir) {
                    Some(value) => {
                        substituted = true;
                        args.push(value);
                    }
                    None => args.push(arg.clone()),
                }
            }
            if !substituted {
                args.push(dir.into_owned());
            }
            args
        }
    }

    /// Reads the default verb for directories and its command from HKCR. The
    /// user's own classes are merged into this view by Windows, so a
    /// third-party manager that replaced Explorer shows up here.
    fn registered_handler() -> Option<ShellCommand> {
        let classes = RegKey::predef(HKEY_CLASSES_ROOT);
        for class in DIRECTORY_CLASSES {
            let Ok(shell) = classes.open_subkey_with_flags(format!(r"{class}\shell"), KEY_READ)
            else {
                continue;
            };
            let verb: String = shell.get_value("").unwrap_or_default();
            let verb = verb.trim();
            let verb = if verb.is_empty() { "open" } else { verb };
            let Ok(command) = shell.open_subkey_with_flags(format!(r"{verb}\command"), KEY_READ)
            else {
                continue;
            };
            let raw: Result<String, _> = command.get_value("");
            let Ok(raw) = raw else { continue };
            if let Some(parsed) = parse_shell_command(&raw) {
                return Some(parsed);
            }
        }
        None
    }

    fn parse_shell_command(raw: &str) -> Option<ShellCommand> {
        parse_shell_command_with(raw, |path| path.is_file())
    }

    /// Registry commands are sometimes written without quotes around an exe
    /// path containing spaces (portable installs do this), so grow the token
    /// prefix until it names an existing file before treating the rest as args.
    fn parse_shell_command_with<F>(raw: &str, is_file: F) -> Option<ShellCommand>
    where
        F: Fn(&Path) -> bool,
    {
        let expanded = expand_env_vars(raw.trim());
        let tokens = tokenize(&expanded);
        if tokens.is_empty() {
            return None;
        }
        for end in 1..=tokens.len() {
            let candidate = PathBuf::from(tokens[..end].join(" "));
            if is_file(&candidate) {
                return Some(ShellCommand {
                    program: candidate,
                    args: tokens[end..].to_vec(),
                });
            }
        }
        None
    }

    fn tokenize(command_line: &str) -> Vec<String> {
        let mut tokens = Vec::new();
        let mut current = String::new();
        let mut quoted = false;
        for ch in command_line.chars() {
            match ch {
                '"' => quoted = !quoted,
                c if c.is_whitespace() && !quoted => {
                    if !current.is_empty() {
                        tokens.push(std::mem::take(&mut current));
                    }
                }
                c => current.push(c),
            }
        }
        if !current.is_empty() {
            tokens.push(current);
        }
        tokens
    }

    fn expand_env_vars(input: &str) -> String {
        let mut out = String::with_capacity(input.len());
        let mut rest = input;
        while let Some(start) = rest.find('%') {
            out.push_str(&rest[..start]);
            let after = &rest[start + 1..];
            let Some(end) = after.find('%') else {
                out.push_str(&rest[start..]);
                return out;
            };
            let name = &after[..end];
            match std::env::var(name) {
                Ok(value) if !name.is_empty() => out.push_str(&value),
                _ => out.push_str(&rest[start..=start + end + 1]),
            }
            rest = &after[end + 1..];
        }
        out.push_str(rest);
        out
    }

    fn substitute_placeholders(arg: &str, dir: &str) -> Option<String> {
        let mut out = String::with_capacity(arg.len() + dir.len());
        let mut replaced = false;
        let mut chars = arg.chars().peekable();
        while let Some(ch) = chars.next() {
            if ch == '%' {
                if let Some(&next) = chars.peek() {
                    if FOLDER_PLACEHOLDERS.contains(&next) {
                        chars.next();
                        out.push_str(dir);
                        replaced = true;
                        continue;
                    }
                }
            }
            out.push(ch);
        }
        replaced.then_some(out)
    }

    struct Manager {
        app_path: &'static str,
        locations: &'static [&'static str],
        prefix_args: &'static [&'static str],
    }

    /// Third-party managers probed when none is registered as the default
    /// folder handler. Order is preference order.
    const MANAGERS: &[Manager] = &[
        Manager {
            app_path: "OneCommander.exe",
            locations: &[
                "OneCommander\\OneCommander.exe",
                "Programs\\OneCommander\\OneCommander.exe",
            ],
            prefix_args: &[],
        },
        Manager {
            app_path: "dopus.exe",
            locations: &["GPSoftware\\Directory Opus\\dopus.exe"],
            prefix_args: &[],
        },
        Manager {
            app_path: "TOTALCMD64.EXE",
            locations: &["totalcmd\\TOTALCMD64.EXE", "totalcmd\\TOTALCMD.EXE"],
            prefix_args: &["/O", "/T"],
        },
        Manager {
            app_path: "XYplorer.exe",
            locations: &["XYplorer\\XYplorer.exe"],
            prefix_args: &[],
        },
        Manager {
            app_path: "Q-Dir.exe",
            locations: &["Q-Dir\\Q-Dir.exe"],
            prefix_args: &[],
        },
        Manager {
            app_path: "FreeCommander.exe",
            locations: &["FreeCommander XE\\FreeCommander.exe"],
            prefix_args: &["/T"],
        },
    ];

    fn installed_managers(dir: &Path) -> Vec<(PathBuf, Vec<String>)> {
        let dir = dir.to_string_lossy().into_owned();
        let roots = install_roots();
        let mut found = Vec::new();
        for manager in MANAGERS {
            let program = app_path(manager.app_path).or_else(|| {
                roots
                    .iter()
                    .flat_map(|root| {
                        manager
                            .locations
                            .iter()
                            .map(move |location| root.join(location))
                    })
                    .find(|path| path.is_file())
            });
            let Some(program) = program.filter(|path| path.is_file()) else {
                continue;
            };
            let mut args: Vec<String> = manager.prefix_args.iter().map(|arg| arg.to_string()).collect();
            args.push(dir.clone());
            found.push((program, args));
        }
        found
    }

    fn install_roots() -> Vec<PathBuf> {
        ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"]
            .iter()
            .filter_map(|name| std::env::var_os(name).map(PathBuf::from))
            .collect()
    }

    fn app_path(exe: &str) -> Option<PathBuf> {
        for hive in [HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE] {
            let Ok(app_paths) = RegKey::predef(hive)
                .open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths", KEY_READ)
            else {
                continue;
            };
            let Ok(key) = app_paths.open_subkey_with_flags(exe, KEY_READ) else {
                continue;
            };
            let raw: Result<String, _> = key.get_value("");
            let Ok(raw) = raw else { continue };
            let path = PathBuf::from(expand_env_vars(raw.trim().trim_matches('"')));
            if path.is_file() {
                return Some(path);
            }
        }
        None
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn one_commander_exists(path: &Path) -> bool {
            path == Path::new(r"C:\Program Files\One Commander\OneCommander.exe")
        }

        #[test]
        fn parses_quoted_program_and_substitutes_dash_placeholder() {
            let command = parse_shell_command_with(
                r#""C:\Program Files\One Commander\OneCommander.exe" -"%1""#,
                one_commander_exists,
            )
            .expect("command should parse");

            assert_eq!(
                command.program,
                PathBuf::from(r"C:\Program Files\One Commander\OneCommander.exe")
            );
            assert_eq!(
                command.args_for(Path::new(r"D:\work\terax")),
                vec![r"-D:\work\terax".to_string()]
            );
        }

        #[test]
        fn parses_unquoted_program_with_spaces() {
            let command = parse_shell_command_with(
                r"C:\Program Files\One Commander\OneCommander.exe -%1",
                one_commander_exists,
            )
            .expect("command should parse");

            assert_eq!(
                command.program,
                PathBuf::from(r"C:\Program Files\One Commander\OneCommander.exe")
            );
            assert_eq!(
                command.args_for(Path::new("C:\\data")),
                vec![r"-C:\data".to_string()]
            );
        }

        #[test]
        fn appends_folder_when_command_has_no_placeholder() {
            let command = parse_shell_command_with(r"C:\Windows\explorer.exe", |_| true)
                .expect("command should parse");

            assert_eq!(
                command.args_for(Path::new(r"D:\work")),
                vec![r"D:\work".to_string()]
            );
        }

        #[test]
        fn recognises_explorer_regardless_of_case() {
            let command = parse_shell_command_with(r"C:\Windows\EXPLORER.EXE", |_| true)
                .expect("command should parse");
            assert!(command.is_explorer());
        }

        #[test]
        fn expands_environment_variables() {
            let root = std::env::var("SystemRoot").expect("SystemRoot is set on Windows");
            assert_eq!(
                expand_env_vars(r"%SystemRoot%\explorer.exe"),
                format!(r"{root}\explorer.exe")
            );
        }

        #[test]
        fn leaves_unknown_percent_tokens_intact() {
            assert_eq!(expand_env_vars(r"C:\100%"), r"C:\100%");
        }
    }
}
