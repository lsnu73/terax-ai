import { invoke } from "@tauri-apps/api/core";
import { parseOsc7 } from "@/modules/terminal/lib/osc-handlers";

/** Windows drive paths (C:\ or C:/) and POSIX absolute paths. */
export function isAbsoluteFsPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || /^\/\S/.test(value);
}

/**
 * Converts a terminal link target into a filesystem path. Accepts the raw
 * absolute paths emitted by terminal text detection and `file://` OSC 8
 * hyperlinks; everything else (http, mailto, …) is not a path.
 */
export function pathFromLink(uri: string): string | null {
  if (/^file:\/\//i.test(uri)) {
    const parsed = parseOsc7(uri);
    return parsed && isAbsoluteFsPath(parsed) ? parsed : null;
  }
  return isAbsoluteFsPath(uri) ? uri : null;
}

/**
 * Opens a clicked path in the user's file manager: third-party managers are
 * preferred when installed, with the system explorer as the last resort
 * (same resolution as the settings page's "open config folder").
 */
export function openPathInFileManager(
  path: string,
  onSettled?: () => void,
): Promise<void> {
  return invoke<void>("open_path_in_file_manager", { path })
    .catch((error) => {
      console.error("[terax] failed to open path in file manager:", path, error);
    })
    .finally(() => onSettled?.());
}
