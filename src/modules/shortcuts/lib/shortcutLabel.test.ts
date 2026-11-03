import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyBinding } from "../shortcuts";

const prefsMock = vi.hoisted(() => ({
  shortcuts: {} as Record<string, KeyBinding[]>,
}));

vi.mock("@/modules/settings/preferences", () => ({
  usePreferencesStore: {
    getState: () => ({ shortcuts: prefsMock.shortcuts }),
  },
}));

import { shortcutLabel } from "./shortcutLabel";
import { shortcutHintLabel } from "./useShortcutTokens";

beforeEach(() => {
  prefsMock.shortcuts = {};
});

describe("shortcutLabel", () => {
  it("formats the default binding when there is no user override", () => {
    // commandPalette.open defaults to Ctrl+P.
    expect(shortcutLabel("commandPalette.open")).toBe("Ctrl P");
  });

  it("prefers a user override over the default binding", () => {
    prefsMock.shortcuts = {
      "commandPalette.open": [{ ctrl: true, shift: true, key: "k" }],
    };
    expect(shortcutLabel("commandPalette.open")).toBe("Ctrl Shift K");
  });
});

describe("shortcutHintLabel", () => {
  it("appends the current binding in the tooltip format", () => {
    expect(shortcutHintLabel("Settings", "Ctrl+,")).toBe("Settings(Ctrl+,)");
  });

  it("leaves the label unchanged when the shortcut is unassigned", () => {
    expect(shortcutHintLabel("Settings", "")).toBe("Settings");
  });
});
