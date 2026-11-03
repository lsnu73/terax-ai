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
