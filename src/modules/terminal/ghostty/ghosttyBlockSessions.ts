import { subscribeWindowPresentation } from "@/modules/terminal/ghostty/windowPresentation";
import type { GhosttyTerminalModelApi } from "@/modules/terminal/ghostty/GhosttyTerminalModel";
import type { GhosttyBlocks } from "@/modules/terminal/ghostty/GhosttyBlocks";
import type { BlockMode } from "@/modules/terminal/block/lib/modeMachine";
import {
  type BlockViewportSignature,
  sameBlockViewport,
} from "@/modules/terminal/block/lib/viewportSignature";

export class GhosttyBlockSession {
  controller: GhosttyBlocks | null = null;
  model: GhosttyTerminalModelApi | null = null;
  /** Current cell height in CSS px, supplied by the surface owner. */
  cellHeight: () => number = () => 0;
  private generation = 0;
  private mode: BlockMode = "plain";
  private visible = false;
  private presented = false;
  private unsubscribePresentation: (() => void) | null = null;
  private dirty = true;
  private requestFrame: (() => void) | null = null;
  private unsubscribeDamage: (() => void) | null = null;
  private presentedSignature: BlockViewportSignature | null = null;
  private readonly viewportListeners = new Set<() => void>();
  private readonly modeListeners = new Set<() => void>();

  async attach(
    model: GhosttyTerminalModelApi,
    requestFrame: () => void = () => {},
  ): Promise<void> {
    this.detach();
    const generation = this.generation;
    const { GhosttyBlocks } = await import(
      "@/modules/terminal/ghostty/GhosttyBlocks"
    );
    if (generation !== this.generation || model.isDisposed?.()) return;
    this.model = model;
    this.requestFrame = requestFrame;
    this.controller = new GhosttyBlocks(model);
    this.unsubscribeDamage = model.subscribeDamage(() => this.changed());
    this.unsubscribePresentation = subscribeWindowPresentation((state) => {
      this.presented = state.visible;
      if (state.visible) this.changed();
      else this.invalidateViewport();
    });
    this.changed();
  }

  detach(): void {
    this.generation++;
    this.unsubscribePresentation?.();
    this.unsubscribePresentation = null;
    this.unsubscribeDamage?.();
    this.unsubscribeDamage = null;
    this.controller?.dispose();
    this.controller = null;
    this.model = null;
    this.requestFrame = null;
    this.invalidateViewport();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.changed();
    else this.invalidateViewport();
  }

  changed(): void {
    const mode = this.controller?.mode ?? "plain";
    if (mode !== this.mode) {
      this.mode = mode;
      for (const listener of this.modeListeners) listener();
    }
    this.dirty = true;
    if (this.visible && this.presented) this.requestFrame?.();
  }

  /**
   * Called once per presented renderer frame. Viewport subscribers (block
   * chrome) are notified only when something that positions blocks changed, so
   * frames that merely repaint cells cost no block recomputation and no React
   * commit.
   */
  present(): void {
    if (!this.dirty || !this.visible || !this.presented) return;
    this.dirty = false;
    const signature = this.readSignature();
    if (
      signature &&
      this.presentedSignature &&
      sameBlockViewport(signature, this.presentedSignature)
    )
      return;
    this.presentedSignature = signature;
    for (const listener of this.viewportListeners) listener();
  }

  readonly getMode = (): BlockMode => this.mode;
  readonly subscribeMode = (listener: () => void): (() => void) => {
    this.modeListeners.add(listener);
    return () => {
      this.modeListeners.delete(listener);
    };
  };
  /** Block chrome: notified when block positions may have changed. */
  readonly subscribeViewport = (listener: () => void): (() => void) => {
    this.viewportListeners.add(listener);
    // A new subscriber has never seen the current layout.
    this.presentedSignature = null;
    this.changed();
    return () => {
      this.viewportListeners.delete(listener);
    };
  };

  dispose(): void {
    this.detach();
    this.modeListeners.clear();
    this.viewportListeners.clear();
  }

  private invalidateViewport(): void {
    this.dirty = true;
    this.presentedSignature = null;
  }

  private readSignature(): BlockViewportSignature | null {
    const { model, controller } = this;
    if (!model || !controller) return null;
    const mode = controller.mode;
    return {
      mode,
      revision: controller.revision,
      origin: model.viewportOriginLine(),
      history: model.scrollPosition().history,
      rows: model.rows,
      cols: model.cols,
      cellHeight: this.cellHeight(),
      cursorLine: mode === "running" ? (model.bufferCursorLine?.() ?? -1) : -1,
    };
  }
}

const states = new Map<number, GhosttyBlockSession>();
export function ensureGhosttyBlocks(leafId: number): GhosttyBlockSession {
  let state = states.get(leafId);
  if (!state) {
    state = new GhosttyBlockSession();
    states.set(leafId, state);
  }
  return state;
}
export function ghosttyBlocks(leafId: number): GhosttyBlockSession | undefined {
  return states.get(leafId);
}
export function disposeGhosttyBlocks(leafId: number): void {
  states.get(leafId)?.dispose();
  states.delete(leafId);
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    for (const state of states.values()) state.dispose();
    states.clear();
  });
