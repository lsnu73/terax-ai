/** 搜索弹窗的三个开关，终端/编辑器/Git 历史共用。 */
export type SearchOptions = {
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
};

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 按选项构造匹配器；表达式无效时返回 null。 */
export function buildSearchRegExp(
  query: string,
  options: SearchOptions,
): RegExp | null {
  try {
    const source = options.regex ? query : escapeRegExp(query);
    const pattern = options.wholeWord ? `\\b(?:${source})\\b` : source;
    return new RegExp(pattern, options.caseSensitive ? "" : "i");
  } catch {
    return null;
  }
}
