import { describe, expect, it, vi } from "vitest";
import {
  isLeavingModelsSettings,
  registerModelAutosaveFlush,
  settleModelAutosave,
  trackModelAutosave,
} from "./modelSettingsAutosave";

describe("isLeavingModelsSettings", () => {
  it("detects navigation to another settings section", () => {
    expect(isLeavingModelsSettings("models", true, "general", true)).toBe(true);
  });

  it("detects switching away from the settings tab", () => {
    expect(isLeavingModelsSettings("models", true, "models", false)).toBe(true);
  });

  it("detects both section and visibility changes together", () => {
    expect(isLeavingModelsSettings("models", true, "general", false)).toBe(
      true,
    );
  });

  it("does not notify for other sections or hidden source locations", () => {
    expect(isLeavingModelsSettings("general", true, "editor", true)).toBe(
      false,
    );
    expect(isLeavingModelsSettings("models", false, "general", true)).toBe(
      false,
    );
    expect(isLeavingModelsSettings("models", false, "models", false)).toBe(
      false,
    );
  });
});

describe("settleModelAutosave", () => {
  it("flushes every registered provider form", async () => {
    const first = vi.fn(async () => true);
    const second = vi.fn(async () => true);
    const unregisterFirst = registerModelAutosaveFlush(first);
    const unregisterSecond = registerModelAutosaveFlush(second);

    expect(await settleModelAutosave()).toBe(true);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();

    unregisterFirst();
    unregisterSecond();
  });

  it("reports failure when a flush cannot save its draft", async () => {
    const unregister = registerModelAutosaveFlush(async () => false);
    expect(await settleModelAutosave()).toBe(false);
    unregister();
  });

  it("reports failure when a registered flush throws", async () => {
    const unregister = registerModelAutosaveFlush(async () => {
      throw new Error("invalid draft");
    });
    expect(await settleModelAutosave()).toBe(false);
    unregister();
  });

  it("waits for saves that were already in flight", async () => {
    let resolveSave: ((saved: boolean) => void) | undefined;
    const save = new Promise<boolean>((resolve) => {
      resolveSave = resolve;
    });
    trackModelAutosave(save);

    let settled: boolean | undefined;
    const waiting = settleModelAutosave().then((saved) => {
      settled = saved;
      return saved;
    });
    await Promise.resolve();
    expect(settled).toBeUndefined();

    resolveSave?.(true);
    expect(await waiting).toBe(true);
  });
});
