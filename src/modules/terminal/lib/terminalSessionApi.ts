import {
  clearGhosttySession,
  disposeGhosttySession,
  ghosttyFocusedLeaf,
  ghosttyLeafHasForegroundProcess,
  ghosttyLeafIdForPty,
  ghosttyCwdForLeaf,
  ghosttyPtyIdForLeaf,
  hasGhosttySession,
  pasteIntoGhosttySession,
  submitToGhosttySession,
  whenGhosttySessionReady,
  writeToGhosttySession,
} from "@/modules/terminal/ghostty/useGhosttyTerminalSession";
import { disposeGhosttyBlocks } from "@/modules/terminal/ghostty/ghosttyBlockSessions";
import { forgetLeafPresentation } from "@/modules/terminal/lib/ptyPresentation";

export async function whenSessionReady(
  leafId: number,
  timeoutMs = 4_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(0, deadline - Date.now());
    if (hasGhosttySession(leafId)) {
      await withTimeout(whenGhosttySessionReady(leafId), remaining);
      return;
    }
    await delay(Math.min(10, remaining));
  }
}

export function writeToSession(leafId: number, data: string): boolean {
  return writeToGhosttySession(leafId, data);
}

export function submitToLeaf(leafId: number, text: string): void {
  submitToGhosttySession(leafId, text);
}

export function pasteIntoSession(leafId: number, text: string): boolean {
  return pasteIntoGhosttySession(leafId, text);
}

export function leafCwd(leafId: number): string | null {
  return ghosttyCwdForLeaf(leafId);
}

export function clearFocusedTerminal(): boolean {
  const ghosttyLeaf = ghosttyFocusedLeaf();
  if (ghosttyLeaf !== null) return clearGhosttySession(ghosttyLeaf);
  return false;
}

export function leafIdForPty(ptyId: number): number | null {
  return ghosttyLeafIdForPty(ptyId);
}

export function ptyIdForLeaf(leafId: number): number | null {
  return ghosttyPtyIdForLeaf(leafId);
}

export async function leafHasForegroundProcess(
  leafId: number,
): Promise<boolean> {
  return ghosttyLeafHasForegroundProcess(leafId);
}

export function disposeSession(leafId: number): void {
  disposeGhosttySession(leafId);
  disposeGhosttyBlocks(leafId);
  forgetLeafPresentation(leafId);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withTimeout(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
