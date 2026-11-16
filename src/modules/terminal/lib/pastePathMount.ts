import {
  currentWorkspaceEnv,
  fetchWslAutomountRoot,
} from "@/modules/workspace";
import { WSL_DEFAULT_AUTOMOUNT_ROOT, windowsPathToWsl } from "./pathHistory";

const DRIVE_ABSOLUTE = /^[a-zA-Z]:[\\/]/;
const TOKEN_BOUNDARY = /[\s"'`]/;
const BOUNDARY_DRIVE = /(^|[\s"'`])[a-zA-Z]:[\\/]/g;

/**
 * Rewrites Windows drive absolute paths in pasted text to the WSL mount form
 * (`C:\a\b` -> `/mnt/c/a/b`). A single pasted path keeps its spaces (Explorer
 * address bars contain them); paths inside longer text are whitespace or quote
 * delimited, so an unquoted spaced path there converts only its first token.
 */
export function mountWindowsPaths(text: string, automountRoot: string): string {
  const trimmed = text.trim();
  if (
    !trimmed.includes("\n") &&
    !trimmed.includes('"') &&
    !trimmed.includes("'") &&
    DRIVE_ABSOLUTE.test(trimmed) &&
    boundaryDriveStarts(trimmed) === 1
  ) {
    const converted = windowsPathToWsl(trimmed, automountRoot);
    if (converted !== null) return text.replace(trimmed, converted);
  }
  return convertTokens(text, automountRoot);
}

function boundaryDriveStarts(text: string): number {
  let count = 0;
  for (const _match of text.matchAll(BOUNDARY_DRIVE)) count += 1;
  return count;
}

function convertTokens(text: string, automountRoot: string): string {
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '"' || char === "'") {
      const close = text.indexOf(char, index + 1);
      if (close !== -1) {
        const inner = text.slice(index + 1, close);
        const converted = DRIVE_ABSOLUTE.test(inner)
          ? windowsPathToWsl(inner, automountRoot)
          : null;
        if (converted !== null) {
          out += char + converted + char;
          index = close + 1;
          continue;
        }
      }
      out += char;
      index += 1;
      continue;
    }
    if (
      (index === 0 || TOKEN_BOUNDARY.test(text[index - 1])) &&
      DRIVE_ABSOLUTE.test(text.slice(index, index + 3))
    ) {
      let end = index;
      while (end < text.length && !TOKEN_BOUNDARY.test(text[end])) end += 1;
      const token = text.slice(index, end);
      out += windowsPathToWsl(token, automountRoot) ?? token;
      index = end;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

/**
 * Paste conversion for the current workspace: Windows paths only become WSL
 * paths while the active environment is WSL; every other workspace (and every
 * non-path paste) keeps the text verbatim.
 */
export async function convertPastedTextForWorkspace(
  text: string,
): Promise<string> {
  const env = currentWorkspaceEnv();
  if (env.kind !== "wsl") return text;
  let root = WSL_DEFAULT_AUTOMOUNT_ROOT;
  try {
    root = await fetchWslAutomountRoot(env.distro);
  } catch {
    // Keep the default mount root; a failed IPC must not drop the paste.
  }
  return mountWindowsPaths(text, root);
}
