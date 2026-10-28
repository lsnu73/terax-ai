// 禁用 WebView 原生右键菜单（表情符号、书写方向、更多工具等系统项对本应用无用）。
// 应用自己的右键菜单（Radix ContextMenu 等）走 React onContextMenu，不受影响。
export function disableNativeContextMenu(): void {
  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}
