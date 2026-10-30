import { usePreferencesStore } from "@/modules/settings/preferences";
import { getBindingTokens, SHORTCUTS, type ShortcutId } from "../shortcuts";

const BY_ID = new Map(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

/** Display tokens for the first binding, honoring user overrides. */
export function useShortcutTokens(id: ShortcutId): string[] {
  const user = usePreferencesStore((state) => state.shortcuts);
  const bindings = user[id] ?? BY_ID.get(id)?.defaultBindings;
  return getBindingTokens(bindings?.[0]);
}

/** Compact binding text, for example Ctrl+Shift+I or ⌘+⇧+I. */
export function useShortcutHint(id: ShortcutId): string {
  return useShortcutTokens(id).join("+");
}

/** Tooltip format shared by every button: Label(shortcut). */
export function shortcutHintLabel(label: string, hint: string): string {
  return hint ? `${label}(${hint})` : label;
}
