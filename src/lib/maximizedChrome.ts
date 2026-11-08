import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { USE_CUSTOM_WINDOW_CONTROLS } from "./platform";

type MaximizedListener = (maximized: boolean) => void;

/** Subscribe to the window's maximized state (re-queried on every resize). */
function subscribeMaximized(listener: MaximizedListener): () => void {
  const w = getCurrentWindow();
  let active = true;
  const apply = () => {
    void w.isMaximized().then((maximized) => {
      if (active) listener(maximized);
    });
  };
  apply();
  void w.onResized(apply);
  return () => {
    active = false;
  };
}

/** Mirror the window's maximized state onto `<html data-maximized>`.
 *
 * The borderless chrome paints rounded corners over a transparent window;
 * maximized those corners leave dead zones at the screen corners where clicks
 * fall through to whatever is underneath (see `globals.css`, which squares the
 * chrome off while this attribute is present). */
export function trackMaximizedChrome(): void {
  if (!USE_CUSTOM_WINDOW_CONTROLS) return;
  subscribeMaximized((maximized) => {
    if (maximized) {
      document.documentElement.dataset.maximized = "true";
    } else {
      document.documentElement.removeAttribute("data-maximized");
    }
  });
}

/** Reactive maximized state for React components (custom-chrome platforms). */
export function useWindowMaximized(): boolean {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!USE_CUSTOM_WINDOW_CONTROLS) return;
    return subscribeMaximized(setMaximized);
  }, []);
  return maximized;
}
