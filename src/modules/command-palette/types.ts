import type { ShortcutId } from "@/modules/shortcuts";
import type { TerminalIcon } from "@hugeicons/core-free-icons";

type PaletteIcon = typeof TerminalIcon;

export type PaletteItem = {
  id: string;
  titleKey: string;
  titleParams?: Record<string, unknown>;
  group: string;
  keywords?: string[];
  icon?: PaletteIcon;
  iconUrl?: string;
  shortcutId?: ShortcutId;
  trailing?: string;
  disabledReasonKey?: string;
  run: () => void;
};

export type PaletteMode = "commands" | "content" | "help";
