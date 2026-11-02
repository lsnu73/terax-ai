export type TerminalSearchOptions = {
  readonly incremental?: boolean;
  /** 正则表达式搜索；无效表达式按无匹配处理。 */
  readonly regex?: boolean;
  readonly decorations?: {
    readonly matchBackground?: string;
    readonly activeMatchBackground?: string;
    readonly matchOverviewRuler?: string;
    readonly activeMatchColorOverviewRuler?: string;
  };
};

export interface TerminalSearchController {
  findNext(query: string, options?: TerminalSearchOptions): boolean;
  findPrevious(query: string, options?: TerminalSearchOptions): boolean;
  clearDecorations(): void;
}
