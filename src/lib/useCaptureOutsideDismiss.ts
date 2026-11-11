import { type RefObject, useEffect, useRef } from "react";

type ContentRef = RefObject<HTMLElement | null>;

export function listenForOutsidePointerDown(
  doc: Document,
  contentRef: ContentRef,
  onDismiss: () => void,
): () => void {
  const onPointerDown = (event: PointerEvent) => {
    if (contentRef.current?.contains(event.target as Node | null)) return;
    onDismiss();
  };
  doc.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    doc.removeEventListener("pointerdown", onPointerDown, true);
  };
}

/** Close a floating menu before terminal surfaces can stop pointer bubbling. */
export function useCaptureOutsideDismiss(
  open: boolean,
  contentRef: ContentRef,
  onDismiss: () => void,
) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return;
    return listenForOutsidePointerDown(document, contentRef, () => {
      onDismissRef.current();
    });
  }, [open, contentRef]);
}
