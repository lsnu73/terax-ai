import type {
  BlockContext,
  BlockMatch,
  PositionedBlock,
  VisibleBlocks,
} from "@/modules/terminal/block/lib/blockTypes";
import type { BlockMode } from "@/modules/terminal/block/lib/modeMachine";
import type { GhosttyTerminalModelApi } from "@/modules/terminal/ghostty/GhosttyTerminalModel";
import type { GhosttyTerminalEvent } from "@terax/ghostty-core/protocol";

const MAX_BLOCKS = 1000;
const MAX_METADATA_UNITS = 256 * 1024;
/** Command timeline reveal: eased scroll duration in milliseconds. */
const REVEAL_SCROLL_MS = 180;
// Node test environments have no frame timers; the eased reveal then
// degrades to the instant scroll.
const frameTimers: {
  request?: (callback: (now: number) => void) => number;
  cancel?: (id: number) => void;
} =
  typeof requestAnimationFrame === "function" &&
  typeof cancelAnimationFrame === "function"
    ? {
        request: (callback) => requestAnimationFrame(callback),
        cancel: (id) => cancelAnimationFrame(id),
      }
    : {};
type BlockModel = GhosttyTerminalModelApi &
  Required<
    Pick<
      GhosttyTerminalModelApi,
      | "enableSemanticMarkers"
      | "semanticMarkerLine"
      | "semanticMarkerColumn"
      | "readTextRange"
      | "readCellLine"
      | "bufferCursorLine"
    >
  >;

type Entry = {
  id: string;
  command: string;
  canRerun: boolean;
  cwd: string;
  start: number;
  end: number | null;
  exitCode: number | null;
  startedAt: number;
  finishedAt: number;
};

/** One command in the whole-history timeline overlay (buffer-line space). */
export type TimelineEntry = {
  id: string;
  command: string;
  /** Buffer line of the command row; the bar position and reveal target. */
  start: number;
  running: boolean;
  ok: boolean;
  exitCode: number | null;
};

export class GhosttyBlocks {
  private readonly model: BlockModel;
  private entries: Entry[] = [];
  private live: Entry | null = null;
  private phase: "prompt" | "running" = "prompt";
  private integrated = false;
  private blockInputDisabled = false;
  private selected: string | null = null;
  private pendingCommand = "";
  private pendingCommandComplete = false;
  private sequence = 0;
  private metadataUnits = 0;
  private clearGeneration = 0;
  private entryRevision = 0;
  private revealRaf = 0;
  private timelineCache: {
    key: string;
    data: { items: TimelineEntry[]; totalLines: number };
  } | null = null;

  constructor(model: GhosttyTerminalModelApi) {
    requireBlockModel(model);
    this.model = model;
    model.enableSemanticMarkers(true);
  }

  get mode(): BlockMode {
    if (this.model.modes().alternateScreen) return "alt";
    return this.integrated && !this.blockInputDisabled ? this.phase : "plain";
  }

  /**
   * Bumps whenever the set of blocks or any block's metadata can have changed
   * (start, finish, clear). Lets callers skip `visibleBlocks` while it, the
   * viewport and the mode are all unchanged.
   */
  get revision(): number {
    return this.entryRevision;
  }

  diagnostics(): { blocks: number; metadataBytes: number } {
    return {
      blocks: this.entries.length,
      metadataBytes: this.metadataUnits * 2,
    };
  }

  submitted(command: string): void {
    this.pendingCommand = command.slice(0, 8192);
    this.pendingCommandComplete = command.length <= 8192;
  }

  handle(event: GhosttyTerminalEvent, cwd: string): void {
    if (
      event.type === "end-of-input" ||
      event.type === "end-of-command" ||
      event.type === "screen-cleared" ||
      event.type === "overflow"
    )
      this.entryRevision++;
    if (event.type === "prompt-end") {
      this.integrated = true;
      this.blockInputDisabled = event.blockInput === false;
    }
    if (event.type === "prompt-start" || event.type === "prompt-end")
      this.phase = "prompt";
    if (event.type === "end-of-input") {
      this.integrated = true;
      this.phase = "running";
      if (!event.marker) return;
      if (this.live) this.finish(event.marker, null);
      const raw = event.command ?? "";
      const oscCommand = decodeBlockCommand(raw);
      const command = this.pendingCommand || oscCommand.slice(0, 8192);
      // Shell-reported commands are truncated at 256 characters by the
      // integration scripts; only a payload below that cap is safe to rerun.
      const canRerun = this.pendingCommand
        ? this.pendingCommandComplete
        : !!oscCommand && raw.length < 256;
      this.pendingCommand = "";
      this.pendingCommandComplete = false;
      this.live = {
        id: String(++this.sequence),
        command,
        canRerun,
        cwd: cwd.slice(0, 32_768),
        start: event.marker,
        end: null,
        exitCode: null,
        startedAt: Date.now(),
        finishedAt: 0,
      };
      this.entries.push(this.live);
      this.metadataUnits += this.live.command.length + this.live.cwd.length;
      while (
        this.entries.length > MAX_BLOCKS ||
        this.metadataUnits > MAX_METADATA_UNITS
      ) {
        const removed = this.entries.shift();
        if (!removed) break;
        this.metadataUnits -= removed.command.length + removed.cwd.length;
      }
    } else if (event.type === "end-of-command") {
      this.phase = "prompt";
      if (event.marker) this.finish(event.marker, event.exitCode);
    } else if (event.type === "screen-cleared") {
      this.clearMetadata();
    } else if (event.type === "overflow") {
      this.clear();
    }
  }

  private finish(marker: number, exitCode: number | null): void {
    if (!this.live) return;
    this.live.end = marker;
    this.live.exitCode = exitCode;
    this.live.finishedAt = Date.now();
    this.live = null;
  }

  clear(): void {
    this.model.enableSemanticMarkers(false);
    this.model.enableSemanticMarkers(true);
    this.clearMetadata();
  }

  private clearMetadata(): void {
    frameTimers.cancel?.(this.revealRaf);
    this.clearSelection();
    this.clearGeneration++;
    this.entryRevision++;
    this.entries = [];
    this.metadataUnits = 0;
    this.live = null;
    this.selected = null;
    this.pendingCommand = "";
    this.pendingCommandComplete = false;
    this.timelineCache = null;
    this.model.setBlockSearchMatch?.(null);
  }

  private range(entry: Entry): {
    start: number;
    end: number;
    startCol: number;
    endCol: number;
    empty: boolean;
  } | null {
    const start = this.model.semanticMarkerLine?.(entry.start);
    const end =
      entry.end === null
        ? this.model.bufferCursorLine?.()
        : this.model.semanticMarkerLine?.(entry.end);
    if (start == null || end == null) return null;
    const startCol = this.model.semanticMarkerColumn?.(entry.start) ?? 0;
    const endCol =
      entry.end === null
        ? this.model.cols
        : (this.model.semanticMarkerColumn?.(entry.end) ?? 0);
    const empty = end === start && endCol <= startCol;
    return {
      start,
      startCol,
      end: endCol === 0 && end > start ? end - 1 : Math.max(start, end),
      endCol: endCol === 0 ? this.model.cols - 1 : endCol - 1,
      empty,
    };
  }

  readById(id: string): BlockContext | null {
    const entry = this.entries.find((entry) => entry.id === id);
    const range = entry && this.range(entry);
    if (!entry || !range || this.mode === "alt") return null;
    return {
      command: entry.command,
      cwd: entry.cwd,
      exitCode: entry.exitCode,
      output: range.empty
        ? ""
        : this.model
            .readTextRange(range.start, range.end, range.startCol, range.endCol)
            .trimEnd(),
    };
  }

  visibleBlocks(cellHeight: number): VisibleBlocks {
    if (this.mode === "alt" || this.mode === "plain" || cellHeight <= 0)
      return { blocks: [], sticky: null, generation: this.clearGeneration };
    const viewport = this.model.viewportOriginLine();
    const blocks: PositionedBlock[] = [];
    let sticky: PositionedBlock | null = null;
    let low = 0;
    let high = this.entries.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      const range = this.range(this.entries[middle]);
      if (!range || range.end + 1 < viewport) low = middle + 1;
      else high = middle;
    }
    for (let index = low; index < this.entries.length; index++) {
      const entry = this.entries[index];
      const range = this.range(entry);
      if (range && range.start > viewport + this.model.rows + 2) break;
      if (
        !range ||
        range.end + 1 < viewport ||
        range.start > viewport + this.model.rows + 2
      )
        continue;
      const top = (range.start - viewport) * cellHeight;
      const block: PositionedBlock = {
        id: entry.id,
        command: entry.command,
        canRerun: entry.canRerun,
        cwd: entry.cwd,
        exitCode: entry.exitCode,
        running: entry.end === null,
        ok: entry.exitCode === null || entry.exitCode === 0,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
        top,
        bottom: (range.end - viewport + 2) * cellHeight,
        headerTop: top - 1.9 * cellHeight,
      };
      blocks.push(block);
      if (range.start < viewport) sticky = block;
    }
    return { blocks, sticky, generation: this.clearGeneration };
  }

  blockAtLine(line: number, cellHeight: number): PositionedBlock | null {
    if (this.mode === "alt" || this.mode === "plain" || cellHeight <= 0)
      return null;
    const viewport = this.model.viewportOriginLine();
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index];
      const range = this.range(entry);
      if (!range) continue;
      const running = entry.end === null;
      // Both bounds reach past the block edges: the rows above cover the
      // command line and the header gap, the row below covers the divider.
      const firstLine = Math.max(0, range.start - 2);
      const lastLine = running ? range.end : range.end + 1;
      if (line < firstLine || line > lastLine) continue;
      return {
        id: entry.id,
        command: entry.command,
        canRerun: entry.canRerun,
        cwd: entry.cwd,
        exitCode: entry.exitCode,
        running,
        ok: entry.exitCode === null || entry.exitCode === 0,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
        top: (range.start - viewport) * cellHeight,
        bottom: (range.end - viewport + 2) * cellHeight,
        headerTop: (range.start - viewport - 1.9) * cellHeight,
      };
    }
    return null;
  }

  selectAtLine(line: number): boolean {
    if (this.mode === "alt" || this.model.modes().mouseTracking) return false;
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index];
      const range = this.range(entry);
      if (!range || range.empty || line < range.start || line > range.end)
        continue;
      if (entry.id === this.selected) return this.clearSelection();
      this.select(entry, range);
      return true;
    }
    return this.clearSelection();
  }

  private select(
    entry: Entry,
    range: { start: number; end: number; startCol: number; endCol: number },
  ): void {
    this.selected = entry.id;
    this.model.setSelection?.({
      anchor: { line: range.start, column: range.startCol },
      focus: { line: range.end, column: range.endCol },
      rectangular: false,
    });
  }

  clearSelection(): boolean {
    if (this.selected === null) return false;
    this.selected = null;
    this.model.setSelection?.(null);
    return true;
  }

  navigate(direction: -1 | 1): boolean {
    if (this.mode === "alt") return false;
    const selected = this.entries.findIndex(
      (entry) => entry.id === this.selected,
    );
    let index = selected < 0 ? this.entries.length - 1 : selected + direction;
    while (index >= 0 && index < this.entries.length) {
      const entry = this.entries[index];
      const range = this.range(entry);
      if (range && !range.empty) {
        this.select(entry, range);
        this.revealLine(Math.max(0, range.start - 2));
        return true;
      }
      index += direction;
    }
    return false;
  }

  /**
   * Whole-history view for the command timeline overlay: every tracked block
   * with its current command-row buffer line. Cached against a cheap key
   * (revision plus a coarse history bucket, rows and cols), so streaming
   * output does not re-derive every range per parsed line; the bar positions
   * self-correct on the next revision, scroll or resize.
   */
  timeline(): { items: TimelineEntry[]; totalLines: number } {
    const history = this.model.scrollPosition().history;
    const key = `${this.entryRevision}|${Math.floor(history / 8)}|${this.model.rows}|${this.model.cols}`;
    if (this.timelineCache?.key === key) return this.timelineCache.data;
    const items: TimelineEntry[] = [];
    if (this.mode !== "alt" && this.mode !== "plain") {
      for (const entry of this.entries) {
        const start = this.model.semanticMarkerLine?.(entry.start);
        if (start == null) continue;
        items.push({
          id: entry.id,
          command: entry.command,
          start,
          running: entry.end === null,
          ok: entry.exitCode === null || entry.exitCode === 0,
          exitCode: entry.exitCode,
        });
      }
    }
    const data = { items, totalLines: history + this.model.rows };
    this.timelineCache = { key, data };
    return data;
  }

  /**
   * Timeline reveal: select the block like navigate does and bring its
   * command row into view. `smooth` eases the scroll; the animation writes
   * absolute offsets, so user scrolling simply overrides it.
   */
  revealBlock(id: string, smooth = false): boolean {
    if (this.mode === "alt") return false;
    const entry = this.entries.find((entry) => entry.id === id);
    const range = entry && this.range(entry);
    if (!entry || !range) return false;
    if (!range.empty) this.select(entry, range);
    this.scrollToLine(Math.max(0, range.start - 2), smooth);
    return true;
  }

  async searchBlock(
    id: string,
    query: string,
    signal?: AbortSignal,
    options?: { regex?: boolean },
  ): Promise<BlockMatch[]> {
    const entry = this.entries.find((entry) => entry.id === id);
    const range = entry && this.range(entry);
    if (
      !entry ||
      !range ||
      range.empty ||
      !query ||
      this.mode === "alt" ||
      signal?.aborted
    )
      return [];
    const generation = this.clearGeneration;
    const cols = this.model.cols;
    let expression: RegExp | null = null;
    if (options?.regex) {
      try {
        expression = new RegExp(query, "gi");
      } catch {
        return [];
      }
    }
    const matches: BlockMatch[] = [];
    let sliceStart = performance.now();
    for (
      let line = range.start;
      line <= range.end && matches.length < 500;
      line++
    ) {
      if (
        line > range.start &&
        ((line - range.start) % 128 === 0 ||
          performance.now() - sliceStart >= 4)
      ) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", finish);
            resolve();
          };
          const timer = setTimeout(finish, 0);
          signal?.addEventListener("abort", finish, { once: true });
        });
        sliceStart = performance.now();
        if (
          signal?.aborted ||
          generation !== this.clearGeneration ||
          this.model.isDisposed?.()
        )
          return [];
        if (
          cols !== this.model.cols ||
          this.model.semanticMarkerLine(entry.start) !== range.start
        )
          return [];
      }
      const cells = this.model.readCellLine(line);
      const lineMatches = expression
        ? matchCellRegex(cells, expression)
        : matchCellText(cells, query);
      for (const match of lineMatches) {
        if (line === range.start && match.col < range.startCol) continue;
        if (line === range.end && match.col + match.len > range.endCol + 1)
          continue;
        matches.push({ line, ...match });
        if (matches.length === 500) break;
      }
    }
    return matches;
  }

  revealMatch(match: BlockMatch): void {
    this.revealLine(Math.max(0, match.line - Math.floor(this.model.rows / 2)));
    this.model.setBlockSearchMatch?.(match);
  }

  clearSearch(): void {
    this.model.setBlockSearchMatch?.(null);
  }

  private revealLine(line: number): void {
    this.model.scrollTo(
      Math.max(0, this.model.scrollPosition().history - line),
    );
  }

  private scrollToLine(line: number, smooth: boolean): void {
    frameTimers.cancel?.(this.revealRaf);
    const target = Math.max(0, this.model.scrollPosition().history - line);
    const request = frameTimers.request;
    if (!smooth || !request) {
      this.model.scrollTo(target);
      return;
    }
    const model = this.model;
    const from = model.scrollPosition().offset;
    const delta = target - from;
    if (Math.abs(delta) < 4) {
      model.scrollTo(target);
      return;
    }
    const startedAt = performance.now();
    const step = (now: number) => {
      if (model.isDisposed?.()) return;
      const progress = Math.min(1, (now - startedAt) / REVEAL_SCROLL_MS);
      model.scrollTo(Math.round(from + delta * (1 - (1 - progress) ** 3)));
      if (progress < 1) this.revealRaf = request(step);
    };
    this.revealRaf = request(step);
  }

  dispose(): void {
    frameTimers.cancel?.(this.revealRaf);
    if (!this.model.isDisposed?.()) this.model.enableSemanticMarkers(false);
  }
}

function decodeBlockCommand(raw: string): string {
  if (raw.startsWith("cmdline_url=")) {
    try {
      return decodeURIComponent(raw.slice(12).split(";")[0]);
    } catch {
      return "";
    }
  }
  if (/^(?:aid|cl|cmdline|redraw)=/.test(raw)) return "";
  return raw;
}

export function matchCellText(
  cells: readonly string[],
  query: string,
): { col: number; len: number }[] {
  let text = "";
  const columns: number[] = [];
  for (let col = 0; col < cells.length; col++) {
    const value = cells[col].toLowerCase();
    for (let i = 0; i < value.length; i++) columns.push(col);
    text += value;
  }
  const needle = query.toLowerCase();
  if (!needle) return [];
  const result: { col: number; len: number }[] = [];
  for (let from = 0; result.length < 500; ) {
    const index = text.indexOf(needle, from);
    if (index < 0) break;
    const col = columns[index];
    let end = columns[index + needle.length - 1] + 1;
    if (end < cells.length && cells[end] === "") end++;
    result.push({ col, len: end - col });
    from = index + needle.length;
  }
  return result;
}

function matchCellRegex(
  cells: readonly string[],
  expression: RegExp,
): { col: number; len: number }[] {
  let text = "";
  const columns: number[] = [];
  for (let col = 0; col < cells.length; col++) {
    for (let i = 0; i < cells[col].length; i++) columns.push(col);
    text += cells[col];
  }
  const result: { col: number; len: number }[] = [];
  expression.lastIndex = 0;
  while (result.length < 500) {
    const match = expression.exec(text);
    if (match === null) break;
    if (!match[0].length) {
      expression.lastIndex++;
      continue;
    }
    const col = columns[match.index];
    let end = columns[match.index + match[0].length - 1] + 1;
    if (end < cells.length && cells[end] === "") end++;
    result.push({ col, len: end - col });
  }
  return result;
}

function requireBlockModel(
  model: GhosttyTerminalModelApi,
): asserts model is BlockModel {
  if (
    !model.enableSemanticMarkers ||
    !model.semanticMarkerLine ||
    !model.semanticMarkerColumn ||
    !model.readTextRange ||
    !model.readCellLine ||
    !model.bufferCursorLine
  )
    throw new Error("Terminal model does not support command blocks");
}
