import type { PaletteMode } from "../types";

export type ParsedQuery = {
  mode: PaletteMode;
  term: string;
  raw: string;
};

const PREFIXES: ReadonlyArray<{ sigil: string; mode: PaletteMode }> = [
  { sigil: "#", mode: "content" },
  { sigil: ">", mode: "paths" },
  { sigil: "?", mode: "help" },
];

export function parseQuery(raw: string): ParsedQuery {
  for (const { sigil, mode } of PREFIXES) {
    if (raw.startsWith(sigil)) {
      return { mode, term: raw.slice(sigil.length).trim(), raw };
    }
  }
  return { mode: "commands", term: raw.trim(), raw };
}

export const MODE_HINTS: ReadonlyArray<{ sigil: string; labelKey: string }> = [
  { sigil: "#", labelKey: "commands.palette.modeContent" },
  { sigil: ">", labelKey: "commands.palette.modePaths" },
];
