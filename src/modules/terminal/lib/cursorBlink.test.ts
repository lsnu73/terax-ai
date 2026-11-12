import { describe, expect, it } from "vitest";

import { shouldCursorBlink } from "./cursorBlink";

describe("shouldCursorBlink", () => {
  it("blinks only when enabled and the window, slot and input are focused", () => {
    expect(shouldCursorBlink(true, true, true, true)).toBe(true);
  });

  it("never blinks when disabled, regardless of focus", () => {
    expect(shouldCursorBlink(false, true, true, true)).toBe(false);
  });

  it("never blinks while the window is inactive", () => {
    expect(shouldCursorBlink(true, false, true, true)).toBe(false);
  });

  it("does not blink an unfocused slot", () => {
    expect(shouldCursorBlink(true, true, false, true)).toBe(false);
  });

  it("does not blink while another control owns keyboard focus", () => {
    expect(shouldCursorBlink(true, true, true, false)).toBe(false);
  });
});
