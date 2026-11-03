export type BlockMarkerEvent =
  | "prompt-start"
  | "prompt-end"
  | "end-of-input"
  | "end-of-command";

/**
 * Detects a shell that never reports command starts. Windows PowerShell 5.1
 * without PSReadLine emits prompt markers (OSC 133;A/B/D) but has no hook
 * left that can emit the command start (OSC 133;C), so command blocks cannot
 * anchor. One completed command cycle without a single command start is that
 * signal; with PSReadLine present the start arrives in every cycle.
 */
export class BlockCommandAnchorProbe {
  private sawPromptEnd = false;
  private sawCommandStart = false;
  private completedWithoutAnchor = 0;

  handle(event: BlockMarkerEvent): void {
    switch (event) {
      case "prompt-start":
        this.sawPromptEnd = false;
        this.sawCommandStart = false;
        break;
      case "prompt-end":
        this.sawPromptEnd = true;
        break;
      case "end-of-input":
        this.sawCommandStart = true;
        break;
      case "end-of-command":
        if (this.sawPromptEnd && !this.sawCommandStart) {
          this.completedWithoutAnchor += 1;
        }
        break;
    }
  }

  /** True once a full command cycle completed without a command start marker. */
  get commandAnchorMissing(): boolean {
    return this.completedWithoutAnchor > 0;
  }
}
