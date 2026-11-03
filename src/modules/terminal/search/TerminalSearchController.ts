export type TerminalSearchOptions = {
  readonly incremental?: boolean;
  /** 正则表达式搜索；无效表达式按无匹配处理。 */
  readonly regex?: boolean;
  /** 区分大小写（默认不区分，与原生搜索一致）。 */
  readonly caseSensitive?: boolean;
  /** 全字匹配。 */
  readonly wholeWord?: boolean;
  readonly decorations?: {
    readonly matchBackground?: string;
    readonly activeMatchBackground?: string;
    readonly matchOverviewRuler?: string;
    readonly activeMatchColorOverviewRuler?: string;
  };
};

export type TerminalSearchMatchStats = {
  readonly total: number;
  readonly selected: number;
};

export interface TerminalSearchController {
  findNext(query: string, options?: TerminalSearchOptions): boolean;
  findPrevious(query: string, options?: TerminalSearchOptions): boolean;
  clearDecorations(): void;
  /** 当前匹配的统计；selected 为选中匹配的下标（-1 表示未选中）。 */
  matchStats?(): TerminalSearchMatchStats;
}
