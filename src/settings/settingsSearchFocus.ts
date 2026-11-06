/**
 * Lets the global Ctrl+F handler reach the settings page, which owns its own
 * search box in the left navigation instead of the header's terminal search.
 */
let focuser: (() => void) | null = null;

export function registerSettingsSearchFocus(focus: () => void): () => void {
  focuser = focus;
  return () => {
    if (focuser === focus) focuser = null;
  };
}

export function focusSettingsSearch(): boolean {
  if (!focuser) return false;
  focuser();
  return true;
}
