export function shouldCursorBlink(
  blinkEnabled: boolean,
  windowActive: boolean,
  slotFocused: boolean,
  inputFocused: boolean,
): boolean {
  return blinkEnabled && windowActive && slotFocused && inputFocused;
}
