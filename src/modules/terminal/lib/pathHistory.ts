/** Minimum and maximum number of remembered paths allowed in settings. */
export const PATH_HISTORY_LIMIT_MIN = 1;
export const PATH_HISTORY_LIMIT_MAX = 100;
export const PATH_HISTORY_LIMIT_DEFAULT = 10;
/** Choices offered in Settings → General → Terminal. */
export const PATH_HISTORY_LIMIT_PRESETS = [5, 10, 20, 50, 100];

/**
 * Records the directory the user just left when the terminal's working
 * directory changes (most recent first, consecutive duplicates collapsed,
 * capped at the configured limit). This is the browser-history model:
 * C:\test -> C:\test1 records C:\test so it can be jumped back to.
 */
export function recordPathHistory(
  history: readonly string[],
  path: string,
  limit: number,
): string[] {
  if (!path) return [...history];
  const capped = Math.min(
    Math.max(Math.round(limit) || PATH_HISTORY_LIMIT_DEFAULT, 1),
    PATH_HISTORY_LIMIT_MAX,
  );
  const next = [path, ...history.filter((entry) => entry !== path)];
  return next.slice(0, capped);
}

/** Subsequence fuzzy filter for the history picker. */
export function filterPathHistory(
  history: readonly string[],
  term: string,
): string[] {
  const query = term.trim().toLowerCase();
  if (!query) return [...history];
  return history.filter((entry) => entry.toLowerCase().includes(query));
}

/** WSL mounts Windows drives here unless /etc/wsl.conf sets [automount] root. */
export const WSL_DEFAULT_AUTOMOUNT_ROOT = "/mnt/";

export type PathHistoryEnv = { kind: "local" } | { kind: "wsl"; distro: string };

const WINDOWS_DRIVE_PATH = /^([a-zA-Z]):(?:\\|\/|$)/;

export function isWindowsDrivePath(path: string): boolean {
  return WINDOWS_DRIVE_PATH.test(path);
}

function normalizeMountRoot(root: string): string {
  const trimmed = root.trim() || WSL_DEFAULT_AUTOMOUNT_ROOT;
  const slashed = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  return slashed.startsWith("/") ? slashed : `/${slashed}`;
}

/** `C:\a\b` -> `<root>c/a/b`; null when the path is not a Windows drive path. */
export function windowsPathToWsl(
  path: string,
  automountRoot: string,
): string | null {
  const match = WINDOWS_DRIVE_PATH.exec(path);
  if (!match) return null;
  const root = normalizeMountRoot(automountRoot);
  const rest = path
    .slice(match[0].length)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  const mounted = `${root}${match[1].toLowerCase()}`;
  return rest ? `${mounted}/${rest}` : mounted;
}

/** `<root>c/a/b` -> `C:\a\b`; null when the path is not under the mount root. */
export function wslMountPathToWindows(
  path: string,
  automountRoot: string,
): string | null {
  const root = normalizeMountRoot(automountRoot);
  if (!path.startsWith(root)) return null;
  const rest = path.slice(root.length);
  const slash = rest.indexOf("/");
  const drive = slash === -1 ? rest : rest.slice(0, slash);
  if (drive.length !== 1 || !/[a-zA-Z]/.test(drive)) return null;
  const suffix = slash === -1 ? "" : rest.slice(slash + 1).replace(/\/+$/, "");
  const windows = `${drive.toUpperCase()}:\\`;
  return suffix ? windows + suffix.replace(/\//g, "\\") : windows;
}

/**
 * Rewrites the shared history for the active workspace: Windows view keeps
 * Windows paths, folds mount paths back to drive paths and hides Linux-only
 * directories; WSL view keeps Linux paths and prefixes Windows paths with the
 * distro's automount root. Same directory recorded in both forms appears once.
 */
export function normalizePathHistoryForEnv(
  history: readonly string[],
  env: PathHistoryEnv,
  automountRoot: string,
): string[] {
  const roots =
    normalizeMountRoot(automountRoot) === WSL_DEFAULT_AUTOMOUNT_ROOT
      ? [automountRoot]
      : [automountRoot, WSL_DEFAULT_AUTOMOUNT_ROOT];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of history) {
    let display: string | null;
    if (env.kind === "local") {
      if (isWindowsDrivePath(entry)) {
        display = entry;
      } else {
        display = null;
        for (const root of roots) {
          display = wslMountPathToWindows(entry, root);
          if (display) break;
        }
      }
    } else {
      display = isWindowsDrivePath(entry)
        ? windowsPathToWsl(entry, automountRoot)
        : entry;
    }
    if (!display) continue;
    const key =
      env.kind === "local"
        ? display.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase()
        : display.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}
