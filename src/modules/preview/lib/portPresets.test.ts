import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREVIEW_PORT_PRESETS,
  duplicatePortIn,
  normalizePreviewPortPresets,
  upsertPreviewPortPreset,
} from "./portPresets";

describe("preview port presets", () => {
  it("falls back to shipped defaults for missing or invalid data", () => {
    expect(normalizePreviewPortPresets(undefined)).toEqual(
      DEFAULT_PREVIEW_PORT_PRESETS,
    );
    expect(normalizePreviewPortPresets({ port: 5173 })).toEqual(
      DEFAULT_PREVIEW_PORT_PRESETS,
    );
  });

  it("keeps stored edits and appends newly shipped defaults", () => {
    const restored = normalizePreviewPortPresets([
      { id: "vite-5173", port: 5173, label: "My Vite", hint: "local app" },
      { id: "custom", port: 9999, label: "Custom", hint: "" },
    ]);
    expect(restored[0]).toEqual({
      id: "vite-5173",
      port: 5173,
      label: "My Vite",
      hint: "local app",
    });
    expect(restored.some((preset) => preset.id === "custom")).toBe(true);
    expect(restored.some((preset) => preset.id === "next-3000")).toBe(true);
  });

  it("drops invalid and duplicate entries", () => {
    const restored = normalizePreviewPortPresets([
      { id: "one", port: 5173, label: "First", hint: "" },
      { id: "two", port: 5173, label: "Duplicate port", hint: "" },
      { id: "bad", port: 0, label: "Bad", hint: "" },
      { id: "one", port: 3000, label: "Duplicate id", hint: "" },
    ]);
    expect(restored.filter((preset) => preset.port === 5173)).toHaveLength(1);
    expect(restored.filter((preset) => preset.id === "one")).toHaveLength(1);
  });

  it("updates by stable id without changing list position", () => {
    const presets = [
      { id: "a", port: 5000, label: "A", hint: "" },
      { id: "b", port: 6000, label: "B", hint: "" },
    ];
    const next = upsertPreviewPortPreset(presets, {
      id: "a",
      port: 7000,
      label: "A2",
      hint: "changed",
    });
    expect(next.map((preset) => preset.id)).toEqual(["a", "b"]);
    expect(next[0]).toMatchObject({ port: 7000, label: "A2" });
  });

  it("detects duplicate ports while ignoring the preset being edited", () => {
    const presets = [
      { id: "a", port: 3000, label: "A", hint: "" },
      { id: "b", port: 4000, label: "B", hint: "" },
    ];
    expect(duplicatePortIn(presets, 3000)).toBe(true);
    expect(duplicatePortIn(presets, 3000, "a")).toBe(false);
  });
});
