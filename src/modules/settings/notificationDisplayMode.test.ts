import { describe, expect, it } from "vitest";
import { coerceNotificationDisplayMode } from "./store";

describe("coerceNotificationDisplayMode", () => {
  it("keeps supported display modes", () => {
    expect(coerceNotificationDisplayMode("toast")).toBe("toast");
    expect(coerceNotificationDisplayMode("badge")).toBe("badge");
  });

  it("falls back to toast for invalid persisted values", () => {
    expect(coerceNotificationDisplayMode("quiet")).toBe("toast");
    expect(coerceNotificationDisplayMode(null)).toBe("toast");
    expect(coerceNotificationDisplayMode(undefined)).toBe("toast");
  });
});
