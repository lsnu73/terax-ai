import type {
  TerminalSearchController,
  TerminalSearchOptions,
} from "@/modules/terminal/search/TerminalSearchController";
import type {
  GhosttySearchStatus,
  GhosttyTerminalModelApi,
} from "../GhosttyTerminalModel";

const SEARCH_STEP_BUDGET = 256;

type Direction = "next" | "previous";

export type GhosttySearchSnapshot = {
  readonly query: string;
  readonly pendingDirection: Direction | null;
  readonly regex?: boolean;
};

type Scheduler = {
  readonly request: (callback: () => void) => number;
  readonly cancel: (handle: number) => void;
};

type RegexMatch = {
  readonly line: number;
  readonly start: number;
  readonly end: number;
};

export class GhosttySearchController implements TerminalSearchController {
  private query = "";
  private status: GhosttySearchStatus = emptyStatus();
  private viewportMask: Uint8Array = new Uint8Array(0);
  private scratchMask: Uint8Array = new Uint8Array(0);
  private maskCells = 0;
  private maskRevisionValue = 0;
  private pendingDirection: Direction | null = null;
  private scheduledStep: number | null = null;
  private disposed = false;
  private suspended = false;
  // 正则模式：原生搜索只支持纯文本，正则在 TS 侧基于缓冲区文本实现，
  // 复用同一套 viewport 高亮 mask。matches 以行号/单元格列定位。
  private regex = false;
  private regexMatches: RegexMatch[] = [];
  private regexSelected = -1;
  private regexDirty = false;

  constructor(
    private readonly model: GhosttyTerminalModelApi,
    private readonly onChange: () => void,
    private readonly scheduler: Scheduler = browserScheduler(),
  ) {}

  findNext(query: string, options?: TerminalSearchOptions): boolean {
    return this.find(query, "next", options?.regex === true);
  }

  findPrevious(query: string, options?: TerminalSearchOptions): boolean {
    return this.find(query, "previous", options?.regex === true);
  }

  snapshot(): GhosttySearchSnapshot {
    return {
      query: this.query,
      pendingDirection: this.pendingDirection,
      regex: this.regex,
    };
  }

  restore(snapshot: GhosttySearchSnapshot): void {
    if (this.disposed) return;
    this.cancelStep();
    this.query = snapshot.query;
    this.pendingDirection = snapshot.pendingDirection;
    this.regex = snapshot.regex === true;
    this.regexDirty = true;
    this.refresh();
  }

  suspend(): void {
    this.suspended = true;
    this.cancelStep();
  }

  resume(): void {
    this.suspended = false;
    this.regexDirty = true;
    this.refresh();
  }

  clearDecorations(): void {
    if (this.disposed) return;
    this.cancelStep();
    this.query = "";
    this.pendingDirection = null;
    this.regex = false;
    this.regexMatches = [];
    this.regexSelected = -1;
    this.regexDirty = false;
    this.model.clearSearch();
    this.status = emptyStatus();
    this.commitMask(new Uint8Array(0), 0);
    this.onChange();
  }

  refreshOverlay(): void {
    if (this.disposed || this.suspended || this.query) return;
    if (this.model.blockSearchActive?.()) this.rebuildViewportMask();
    else if (this.viewportMask.length) this.commitMask(new Uint8Array(0), 0);
  }

  /** Increments only when the set of highlighted cells actually changes. */
  get maskRevision(): number {
    return this.maskRevisionValue;
  }

  /**
   * One byte per viewport cell (0 none, 1 match, 2 selected match), row-major,
   * or null when nothing is highlighted. Borrowed: valid until the next change.
   */
  viewportMaskBytes(): Uint8Array | null {
    return this.maskCells > 0 ? this.viewportMask : null;
  }

  refresh(): void {
    if (this.disposed) return;
    if (!this.query) {
      this.refreshOverlay();
      return;
    }
    this.step();
  }

  invalidate(): void {
    if (this.disposed || this.suspended || !this.query) return;
    this.regexDirty = true;
    this.scheduleStep();
  }

  matchAt(row: number, column: number): 0 | 1 | 2 {
    if (
      row < 0 ||
      row >= this.model.rows ||
      column < 0 ||
      column >= this.model.cols
    ) {
      return 0;
    }
    return (this.viewportMask[row * this.model.cols + column] ?? 0) as
      | 0
      | 1
      | 2;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelStep();
    this.viewportMask = new Uint8Array(0);
    this.scratchMask = new Uint8Array(0);
    this.maskCells = 0;
    this.maskRevisionValue += 1;
  }

  private find(query: string, direction: Direction, regex: boolean): boolean {
    if (this.disposed || this.suspended || query.length === 0) return false;
    if (query !== this.query || regex !== this.regex) {
      this.cancelStep();
      this.query = query;
      this.regex = regex;
      this.regexMatches = [];
      this.regexSelected = -1;
      if (regex) {
        // 切到正则前清掉原生搜索状态，避免两套高亮叠加。
        this.model.clearSearch();
        this.status = emptyStatus();
        this.regexDirty = true;
      } else {
        this.status = this.model.setSearchQuery(query);
      }
    }
    this.pendingDirection = direction;
    this.step();
    return this.status.totalMatches > 0;
  }

  private step(): void {
    if (this.disposed || this.suspended || !this.query) return;
    if (this.regex) {
      this.stepRegex();
      return;
    }
    this.status = this.model.stepSearch(SEARCH_STEP_BUDGET);
    if (
      this.status.complete &&
      this.status.totalMatches > 0 &&
      this.pendingDirection
    ) {
      const direction = this.pendingDirection;
      this.pendingDirection = null;
      this.status = this.model.selectSearchMatch(direction);
    }
    this.rebuildViewportMask();
    this.onChange();
    if (!this.status.complete) this.scheduleStep();
    else this.cancelStep();
  }

  private stepRegex(): void {
    if (this.regexDirty) {
      this.regexDirty = false;
      this.rebuildRegexMatches();
    }
    if (this.status.totalMatches > 0 && this.pendingDirection) {
      const direction = this.pendingDirection;
      this.pendingDirection = null;
      this.selectRegexMatch(direction);
    }
    this.rebuildViewportMask();
    this.onChange();
    this.cancelStep();
  }

  private rebuildRegexMatches(): void {
    this.regexMatches = [];
    let expression: RegExp;
    try {
      expression = new RegExp(this.query, "gi");
    } catch {
      this.status = { ...emptyStatus(), active: true };
      this.regexSelected = -1;
      return;
    }
    const readCellLine = this.model.readCellLine?.bind(this.model);
    if (!readCellLine) {
      this.status = { ...emptyStatus(), active: true };
      return;
    }
    const { history } = this.model.scrollPosition();
    const total = history + this.model.rows;
    for (let line = 0; line < total; line += 1) {
      const cells = readCellLine(line);
      if (!cells.length) continue;
      const text = cells.join("");
      if (!text.trim()) continue;
      // 字符串索引 → 单元格列的前缀和（宽字符占多列时仍然准确）。
      const offsets = new Array<number>(cells.length + 1);
      for (let i = 0; i < cells.length; i += 1) {
        offsets[i + 1] = offsets[i] + cells[i].length;
      }
      const columnAt = (index: number): number => {
        let lo = 0;
        let hi = cells.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (offsets[mid + 1] <= index) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      };
      expression.lastIndex = 0;
      for (;;) {
        const match = expression.exec(text);
        if (match === null) break;
        if (match[0].length === 0) {
          expression.lastIndex += 1;
          continue;
        }
        this.regexMatches.push({
          line,
          start: columnAt(match.index),
          end: columnAt(match.index + match[0].length),
        });
      }
    }
    if (this.regexSelected >= this.regexMatches.length) {
      this.regexSelected = this.regexMatches.length - 1;
    }
    this.status = {
      active: true,
      pending: false,
      complete: true,
      generation: this.status.generation,
      totalMatches: this.regexMatches.length,
      selectedIndex: this.regexSelected,
    };
  }

  private selectRegexMatch(direction: Direction): void {
    const count = this.regexMatches.length;
    if (!count) return;
    if (this.regexSelected < 0) {
      const top = this.model.viewportOriginLine();
      if (direction === "next") {
        const index = this.regexMatches.findIndex((m) => m.line >= top);
        this.regexSelected = index < 0 ? 0 : index;
      } else {
        let index = -1;
        for (let i = 0; i < count; i += 1) {
          if (this.regexMatches[i].line < top) index = i;
        }
        this.regexSelected = index < 0 ? count - 1 : index;
      }
    } else {
      this.regexSelected =
        (this.regexSelected + (direction === "next" ? 1 : -1) + count) % count;
    }
    const match = this.regexMatches[this.regexSelected];
    if (match) this.scrollRegexLineIntoView(match.line);
    this.status = { ...this.status, selectedIndex: this.regexSelected };
  }

  private scrollRegexLineIntoView(line: number): void {
    const origin = this.model.viewportOriginLine();
    if (line >= origin && line < origin + this.model.rows) return;
    const { history } = this.model.scrollPosition();
    this.model.scrollTo(Math.max(0, Math.min(history, history - line)));
  }

  private rebuildViewportMask(): void {
    const length = this.model.cols * this.model.rows;
    if (this.scratchMask.length !== length) {
      this.scratchMask = new Uint8Array(length);
    } else {
      this.scratchMask.fill(0);
    }
    let cells = 0;
    if (this.regex) {
      const origin = this.model.viewportOriginLine();
      for (let i = 0; i < this.regexMatches.length; i += 1) {
        const match = this.regexMatches[i];
        const row = match.line - origin;
        if (row < 0 || row >= this.model.rows) continue;
        cells += this.fillMatch(
          row,
          match.start,
          match.end,
          i === this.regexSelected,
        );
      }
      this.commitMask(this.scratchMask, cells);
      return;
    }
    for (const match of this.model.searchViewportMatches()) {
      cells += this.fillMatch(
        match.row,
        match.startColumn,
        match.endColumn,
        match.selected,
      );
    }
    this.commitMask(this.scratchMask, cells);
  }

  private fillMatch(
    row: number,
    startColumn: number,
    endColumn: number,
    selected: boolean,
  ): number {
    if (row < 0 || row >= this.model.rows) return 0;
    const start = Math.max(0, Math.min(this.model.cols, startColumn));
    const end = Math.max(start, Math.min(this.model.cols, endColumn));
    this.scratchMask.fill(
      selected ? 2 : 1,
      row * this.model.cols + start,
      row * this.model.cols + end,
    );
    return end - start;
  }

  /** Installs `next` when it differs; returns true if `next` was adopted. */
  private commitMask(next: Uint8Array, cells: number): boolean {
    const current = this.viewportMask;
    let same = next.length === current.length;
    for (let index = 0; same && index < next.length; index += 1) {
      same = next[index] === current[index];
    }
    if (same) return false;
    if (next === this.scratchMask) this.scratchMask = current;
    this.viewportMask = next;
    this.maskCells = cells;
    this.maskRevisionValue += 1;
    return true;
  }

  private scheduleStep(): void {
    if (this.scheduledStep !== null) return;
    this.scheduledStep = this.scheduler.request(() => {
      this.scheduledStep = null;
      this.step();
    });
  }

  private cancelStep(): void {
    if (this.scheduledStep !== null) {
      this.scheduler.cancel(this.scheduledStep);
    }
    this.scheduledStep = null;
  }
}

function emptyStatus(): GhosttySearchStatus {
  return {
    active: false,
    pending: false,
    complete: true,
    generation: 0,
    totalMatches: 0,
    selectedIndex: -1,
  };
}

function browserScheduler(): Scheduler {
  return {
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  };
}
