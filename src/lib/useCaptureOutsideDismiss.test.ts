import { describe, expect, it, vi } from "vitest";
import { listenForOutsidePointerDown } from "./useCaptureOutsideDismiss";

function setup() {
  let listener: ((event: PointerEvent) => void) | undefined;
  const addEventListener = vi.fn(
    (_type: string, callback: (event: PointerEvent) => void) => {
      listener = callback;
    },
  );
  const removeEventListener = vi.fn(() => {
    listener = undefined;
  });
  const doc = {
    addEventListener,
    removeEventListener,
  } as unknown as Document;
  const inside = {} as Node;
  const outside = {} as Node;
  const content = {
    contains: (target: Node | null) => target === inside,
  } as HTMLElement;
  const onDismiss = vi.fn();
  const dispatch = (target: Node) =>
    listener?.({ target } as unknown as PointerEvent);
  return {
    doc,
    inside,
    outside,
    content,
    onDismiss,
    dispatch,
    addEventListener,
    removeEventListener,
  };
}

describe("listenForOutsidePointerDown", () => {
  it("dismisses only for targets outside the floating content", () => {
    const {
      doc,
      inside,
      outside,
      content,
      onDismiss,
      dispatch,
      addEventListener,
    } = setup();
    const dispose = listenForOutsidePointerDown(
      doc,
      { current: content },
      onDismiss,
    );

    expect(addEventListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
      true,
    );
    dispatch(inside);
    expect(onDismiss).not.toHaveBeenCalled();

    dispatch(outside);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("removes the capture listener on cleanup", () => {
    const { doc, outside, content, onDismiss, dispatch, removeEventListener } =
      setup();
    const dispose = listenForOutsidePointerDown(
      doc,
      { current: content },
      onDismiss,
    );

    dispose();
    expect(removeEventListener).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
      true,
    );
    dispatch(outside);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
