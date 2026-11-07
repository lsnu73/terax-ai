import { describe, expect, it, vi } from "vitest";
import { createAiAttachmentDropTarget } from "./aiAttachmentDrop";

describe("createAiAttachmentDropTarget", () => {
  it("marks the panel as a drop target only while the pointer is inside", () => {
    const setTarget = vi.fn();
    const attach = vi.fn();
    const target = createAiAttachmentDropTarget({
      hitTest: (x) => x > 100,
      attach,
      setTarget,
    });

    expect(target.updateTarget(200, 0)).toBe(true);
    expect(setTarget).toHaveBeenLastCalledWith(true);

    expect(target.updateTarget(0, 0)).toBe(false);
    expect(setTarget).toHaveBeenLastCalledWith(false);
  });

  it("attaches dropped paths when the pointer is inside the panel", () => {
    const attach = vi.fn();
    const target = createAiAttachmentDropTarget({
      hitTest: () => true,
      attach,
      setTarget: vi.fn(),
    });

    expect(target.dropPath(["/repo/a.ts", "/repo/b.ts"], 10, 20)).toBe(true);
    expect(attach).toHaveBeenCalledWith(["/repo/a.ts", "/repo/b.ts"]);
  });

  it("refuses drops outside the panel and clears the highlight", () => {
    const setTarget = vi.fn();
    const attach = vi.fn();
    const target = createAiAttachmentDropTarget({
      hitTest: () => false,
      attach,
      setTarget,
    });

    expect(target.dropPath(["/repo/a.ts"], 10, 20)).toBe(false);
    expect(attach).not.toHaveBeenCalled();
    expect(setTarget).toHaveBeenLastCalledWith(false);
  });

  it("clears the highlight", () => {
    const setTarget = vi.fn();
    const target = createAiAttachmentDropTarget({
      hitTest: () => true,
      attach: vi.fn(),
      setTarget,
    });

    target.clearTarget();
    expect(setTarget).toHaveBeenCalledWith(false);
  });
});
