//! Second launches never become a second Terax.
//!
//! The desktop shortcut stays clickable while the main window hides to the
//! tray, and the tray's quit only ends the process that owns the icon, so a
//! launch that lands on a running instance must forward there and exit.

use tauri::plugin::TauriPlugin;
use tauri_plugin_single_instance as single_instance;

use crate::modules::tray;

pub fn plugin() -> TauriPlugin<tauri::Wry> {
    single_instance::init(|app, args, _cwd| {
        tray::reveal_main_window(app);
        // args still carries argv[0], the executable path.
        let target = crate::parse_launch_args(args.into_iter().skip(1));
        if !target.files.is_empty() {
            crate::seed_launch_target(app, target);
        }
    })
}
