import { openExternalUrl } from "@/lib/external-link";

/** 链接点击的修饰键：Windows/Linux 用 Ctrl，macOS 用 Cmd。 */
export function linkModifierHeld(event: {
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return event.ctrlKey || event.metaKey;
}

export function createTerminalLinkHandler(focus: () => void) {
  return {
    activate: (_event: MouseEvent, uri: string) =>
      void openExternalUrl(uri, focus),
  };
}
