import { afterEach, describe, expect, it, vi } from "vitest";

const { openUrl } = vi.hoisted(() => ({ openUrl: vi.fn() }));

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));

import {
  createTerminalLinkHandler,
  linkModifierHeld,
} from "./terminalLinks";

describe("linkModifierHeld", () => {
  it("accepts Ctrl or Cmd for the system browser", () => {
    expect(
      linkModifierHeld({ ctrlKey: true, metaKey: false, shiftKey: false }),
    ).toBe(true);
    expect(
      linkModifierHeld({ ctrlKey: false, metaKey: true, shiftKey: false }),
    ).toBe(true);
  });

  it("accepts Shift for the built-in preview", () => {
    expect(
      linkModifierHeld({ ctrlKey: false, metaKey: false, shiftKey: true }),
    ).toBe(true);
  });

  it("ignores an unmodified click", () => {
    expect(
      linkModifierHeld({ ctrlKey: false, metaKey: false, shiftKey: false }),
    ).toBe(false);
  });
});

describe("createTerminalLinkHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens OSC 8 links natively and restores late-bound terminal focus", async () => {
    openUrl.mockResolvedValue(undefined);
    const initialFocus = vi.fn();
    let focus = initialFocus;
    const handler = createTerminalLinkHandler(() => focus());
    focus = vi.fn();

    handler.activate(
      {} as MouseEvent,
      "https://chatgpt.com/codex/settings/usage",
    );

    expect(openUrl).toHaveBeenCalledWith(
      "https://chatgpt.com/codex/settings/usage",
    );
    await vi.waitFor(() => expect(focus).toHaveBeenCalledOnce());
    expect(initialFocus).not.toHaveBeenCalled();
  });
});
