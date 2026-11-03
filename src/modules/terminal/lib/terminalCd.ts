import { isAbsoluteFsPath } from "@/lib/open-path";
import { submitToGhosttySession } from "@/modules/terminal/ghostty/useGhosttyTerminalSession";

/**
 * Builds a portable `cd` command for the integrated shells. The path is
 * double-quoted (PowerShell, cmd, bash/zsh/fish all accept this form) and
 * trailing separators are stripped so a closing quote can't be escaped.
 */
export function buildCdCommand(path: string): string {
  const cleaned = path.replace(/[\\/]+$/, "") || path;
  return `cd "${cleaned.replace(/"/g, '\\"')}"`;
}

/**
 * Shift+click on an absolute path: switch the leaf's shell to that directory
 * by submitting a cd command, like the user typed it. Returns false when the
 * leaf has no live session.
 */
export function cdTerminalLeafTo(leafId: number, path: string): boolean {
  if (!isAbsoluteFsPath(path)) return false;
  return submitToGhosttySession(leafId, buildCdCommand(path));
}
