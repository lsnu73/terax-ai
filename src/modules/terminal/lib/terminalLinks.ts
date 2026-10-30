import { openExternalUrl } from "@/lib/external-link";

export type TerminalLinkModifiers = {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

/** Ctrl/Cmd opens the system browser; Shift opens the built-in preview. */
export function linkModifierHeld(event: TerminalLinkModifiers): boolean {
  return event.ctrlKey || event.metaKey || event.shiftKey;
}

export function createTerminalLinkHandler(focus: () => void) {
  return {
    activate: (_event: MouseEvent, uri: string) =>
      void openExternalUrl(uri, focus),
  };
}
