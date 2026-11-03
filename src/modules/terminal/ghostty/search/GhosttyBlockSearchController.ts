import type { BlockMatch } from "@/modules/terminal/block/lib/blockTypes";
import type { GhosttyBlocks } from "@/modules/terminal/ghostty/GhosttyBlocks";
import type {
  TerminalSearchController,
  TerminalSearchOptions,
} from "@/modules/terminal/search/TerminalSearchController";

export class GhosttyBlockSearchController
  implements TerminalSearchController
{
  private query = "";
  private regex = false;
  private matches: BlockMatch[] = [];
  private selected = -1;
  private pending: AbortController | null = null;

  constructor(
    private readonly blocks: GhosttyBlocks,
    private readonly blockId: string,
    private readonly onError: () => void = () => {},
  ) {}

  findNext(query: string, options?: TerminalSearchOptions): boolean {
    return this.find(query, 1, options);
  }

  findPrevious(query: string, options?: TerminalSearchOptions): boolean {
    return this.find(query, -1, options);
  }

  clearDecorations(): void {
    this.pending?.abort();
    this.pending = null;
    this.query = "";
    this.regex = false;
    this.matches = [];
    this.selected = -1;
    this.blocks.clearSearch();
  }

  private find(
    query: string,
    direction: -1 | 1,
    options?: TerminalSearchOptions,
  ): boolean {
    const regex = options?.regex === true;
    if (query !== this.query || regex !== this.regex) {
      this.pending?.abort();
      this.blocks.clearSearch();
      this.query = query;
      this.regex = regex;
      this.matches = [];
      this.selected = -1;
      const pending = new AbortController();
      this.pending = pending;
      void this.blocks
        .searchBlock(this.blockId, query, pending.signal, { regex })
        .then(
          (matches) => {
            if (pending.signal.aborted) return;
            this.pending = null;
            this.matches = matches;
            if (!matches.length) return;
            this.selected = direction === 1 ? 0 : matches.length - 1;
            this.blocks.revealMatch(matches[this.selected]);
          },
          () => {
            if (pending.signal.aborted) return;
            this.pending = null;
            this.onError();
          },
        );
      return false;
    }
    if (!this.matches.length) return false;
    this.selected =
      this.selected < 0
        ? direction === 1
          ? 0
          : this.matches.length - 1
        : (this.selected + direction + this.matches.length) %
          this.matches.length;
    this.blocks.revealMatch(this.matches[this.selected]);
    return true;
  }
}
