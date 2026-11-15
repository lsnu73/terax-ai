export type CellClass =
  | "space"
  | "word"
  | "cjk"
  | "glue"
  | "path"
  | "quote"
  | "symbol";

export type ColumnRange = { readonly start: number; readonly end: number };

// Wide cells write "" into the following column (spacer), so a "" cell only
// continues its predecessor when that one is wide; other "" cells are blank
// padding and must stay a space so tokens stop at the content edge.
const WIDE_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2329, 0x232a],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f000, 0x1f0ff],
  [0x1f200, 0x1f2ff],
  [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f900, 0x1f9ff],
  [0x1fa70, 0x1faff],
  [0x20000, 0x2fa1f],
  [0x30000, 0x3134a],
];

const CJK_RANGES: readonly (readonly [number, number])[] = [
  [0x3040, 0x30ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xac00, 0xd7af],
  [0xf900, 0xfaff],
  [0x20000, 0x2fa1f],
  [0x30000, 0x3134a],
];

const GLUE_CHARS = new Set(["-", "@", "#", "?", "&", "="]);
const PATH_CHARS = new Set(["/", "\\"]);
const QUOTE_CHARS = new Set(['"', "'", "`"]);
const BRACKET_OPENERS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "（": "）",
  "【": "】",
  "｛": "｝",
  "「": "」",
  "『": "』",
};
const BRACKET_CLOSERS: Record<string, string> = {};
for (const [opener, closer] of Object.entries(BRACKET_OPENERS)) {
  BRACKET_CLOSERS[closer] = opener;
}

type ContainerSpan = {
  readonly openColumn: number;
  readonly openWidth: number;
  readonly closeColumn: number;
  readonly closeWidth: number;
};

type Token = { start: number; end: number; class: CellClass };

type LogicalChar = { char: string; column: number; width: number };

export function wordTokenRangeAt(
  cells: readonly string[],
  column: number,
): ColumnRange {
  if (cells.length === 0) return { start: 0, end: 0 };
  const clamped = Math.min(Math.max(Math.trunc(column), 0), cells.length - 1);
  const tokens = tokenizeColumns(classifyColumns(cells));
  const token = tokens.find(
    (candidate) => clamped >= candidate.start && clamped <= candidate.end,
  );
  return token
    ? { start: token.start, end: token.end }
    : { start: clamped, end: clamped };
}

/**
 * Progressive selection ladder inside paired delimiters (quotes, brackets).
 * Odd steps select the interior, even steps the delimiters included, walking
 * outward one container per pair of steps; null once no enclosing container
 * remains (the caller falls back to the whole line).
 */
export function containerLadderRangeAt(
  cells: readonly string[],
  column: number,
  step: number,
): ColumnRange | null {
  if (!Number.isInteger(step) || step < 1 || cells.length === 0) return null;
  const chain = containerChainAt(cells, column);
  const span = chain[Math.floor((step - 1) / 2)];
  if (!span) return null;
  const full: ColumnRange = {
    start: span.openColumn,
    end: span.closeColumn + span.closeWidth - 1,
  };
  if (step % 2 === 0) return full;
  const start = span.openColumn + span.openWidth;
  return start <= span.closeColumn - 1
    ? { start, end: span.closeColumn - 1 }
    : full;
}

/**
 * Progressive selection ladder over slash/backslash paths. Step 1 extends the
 * clicked word to its path segment ("changelog" to "changelog.md"), or straight
 * to the whole path when the segment adds nothing ("atlas"); step 2 selects the
 * whole path ("docs/atlas/changelog.md"); later steps return null (the caller
 * falls back to the whole line).
 */
export function pathLadderRangeAt(
  cells: readonly string[],
  column: number,
  step: number,
): ColumnRange | null {
  if (!Number.isInteger(step) || step < 1 || cells.length === 0) return null;
  const classes = classifyColumns(cells);
  const info = pathInfoAt(classes, cells, column);
  if (!info) return null;
  const word = wordTokenRangeAt(cells, column);
  const sameRange = (a: ColumnRange | null, b: ColumnRange): boolean =>
    a !== null && a.start === b.start && a.end === b.end;
  if (step === 1) {
    if (!sameRange(info.segment, word)) return info.segment;
    if (info.path && !sameRange(info.path, word)) return info.path;
    return null;
  }
  if (step === 2) {
    if (
      info.path &&
      !sameRange(info.segment, word) &&
      !sameRange(info.path, info.segment)
    ) {
      return info.path;
    }
    return null;
  }
  return null;
}

type PathInfo = { segment: ColumnRange; path: ColumnRange | null };

function isSegmentBaseClass(cls: CellClass): boolean {
  return cls === "word" || cls === "glue" || cls === "cjk";
}

function isSegmentCell(
  classes: readonly CellClass[],
  cells: readonly string[],
  index: number,
): boolean {
  const cls = classes[index];
  if (isSegmentBaseClass(cls)) return true;
  if (cls !== "symbol") return false;
  const text = cells[index] ?? "";
  if (text === ".") {
    const previousBase = index > 0 && isSegmentBaseClass(classes[index - 1]);
    const nextBase =
      index + 1 < classes.length && isSegmentBaseClass(classes[index + 1]);
    if (previousBase && nextBase) return true;
    return (
      (index > 0 && classes[index - 1] === "path") ||
      (index + 1 < classes.length && classes[index + 1] === "path")
    );
  }
  if (text === "%") {
    return index + 1 < classes.length && isHexDigitText(cells[index + 1] ?? "");
  }
  if (text === "~") {
    return (
      (index > 0 && classes[index - 1] === "path") ||
      (index + 1 < classes.length && classes[index + 1] === "path")
    );
  }
  return false;
}

// A segment split at a CJK/ASCII boundary keeps leading prose ("文件在docs/a.md")
// out of the path structure.
function segmentSplitsBetween(
  classes: readonly CellClass[],
  left: number,
  right: number,
): boolean {
  const l = classes[left];
  const r = classes[right];
  if (l !== "word" && l !== "cjk") return false;
  if (r !== "word" && r !== "cjk") return false;
  return (l === "cjk") !== (r === "cjk");
}

function segmentBounds(
  classes: readonly CellClass[],
  cells: readonly string[],
  anchor: number,
): ColumnRange {
  let start = anchor;
  let end = anchor;
  while (
    start > 0 &&
    isSegmentCell(classes, cells, start - 1) &&
    !segmentSplitsBetween(classes, start - 1, start)
  ) {
    start -= 1;
  }
  while (
    end + 1 < classes.length &&
    isSegmentCell(classes, cells, end + 1) &&
    !segmentSplitsBetween(classes, end, end + 1)
  ) {
    end += 1;
  }
  return { start, end };
}

function pathInfoAt(
  classes: readonly CellClass[],
  cells: readonly string[],
  column: number,
): PathInfo | null {
  let anchor = column;
  if (!isSegmentCell(classes, cells, anchor)) {
    if (classes[anchor] !== "path") return null;
    if (
      anchor + 1 < classes.length &&
      isSegmentCell(classes, cells, anchor + 1)
    ) {
      anchor += 1;
    } else if (anchor > 0 && isSegmentCell(classes, cells, anchor - 1)) {
      anchor -= 1;
    } else {
      return null;
    }
  }
  const segment = segmentBounds(classes, cells, anchor);
  let start = segment.start;
  let end = segment.end;
  let hasSeparator = false;
  let cursor = start;
  while (cursor > 0 && classes[cursor - 1] === "path") {
    hasSeparator = true;
    let sepStart = cursor - 1;
    while (sepStart > 0 && classes[sepStart - 1] === "path") sepStart -= 1;
    start = sepStart;
    const before = sepStart - 1;
    if (before < 0 || !isSegmentCell(classes, cells, before)) break;
    let segStart = before;
    while (
      segStart > 0 &&
      isSegmentCell(classes, cells, segStart - 1) &&
      !segmentSplitsBetween(classes, segStart - 1, segStart)
    ) {
      segStart -= 1;
    }
    start = segStart;
    cursor = segStart;
  }
  cursor = end;
  while (cursor + 1 < classes.length && classes[cursor + 1] === "path") {
    hasSeparator = true;
    let sepEnd = cursor + 1;
    while (sepEnd + 1 < classes.length && classes[sepEnd + 1] === "path") {
      sepEnd += 1;
    }
    end = sepEnd;
    const after = sepEnd + 1;
    if (after >= classes.length || !isSegmentCell(classes, cells, after)) break;
    let segEnd = after;
    while (
      segEnd + 1 < classes.length &&
      isSegmentCell(classes, cells, segEnd + 1) &&
      !segmentSplitsBetween(classes, segEnd, segEnd + 1)
    ) {
      segEnd += 1;
    }
    end = segEnd;
    cursor = segEnd;
  }
  return { segment, path: hasSeparator ? { start, end } : null };
}

export function classifyColumns(cells: readonly string[]): CellClass[] {
  const classes: CellClass[] = [];
  const colonColumns: number[] = [];
  const dotColumns: number[] = [];
  for (let column = 0; column < cells.length; column += 1) {
    const text = cells[column] ?? "";
    if (text === "") {
      classes.push("space");
      continue;
    }
    const codePoint = text.codePointAt(0) ?? 0;
    classes.push(classifyCodePoint(codePoint));
    if (codePoint === 0x3a) colonColumns.push(column);
    if (codePoint === 0x2e) dotColumns.push(column);
  }
  for (let column = 1; column < cells.length; column += 1) {
    if ((cells[column] ?? "") !== "") continue;
    const previous = cells[column - 1] ?? "";
    if (previous !== "" && isWideText(previous)) {
      classes[column] = classes[column - 1];
    }
  }
  resolveColonRuns(cells, classes, colonColumns);
  resolveDotRuns(cells, classes, dotColumns);
  return classes;
}

function classifyCodePoint(codePoint: number): CellClass {
  const char = String.fromCodePoint(codePoint);
  if (/\s/u.test(char)) return "space";
  if (inRanges(codePoint, CJK_RANGES)) return "cjk";
  if (codePoint < 0x80) {
    if (
      (codePoint >= 0x30 && codePoint <= 0x39) ||
      (codePoint >= 0x41 && codePoint <= 0x5a) ||
      (codePoint >= 0x61 && codePoint <= 0x7a) ||
      codePoint === 0x5f
    ) {
      return "word";
    }
    if (GLUE_CHARS.has(char)) return "glue";
    if (PATH_CHARS.has(char)) return "path";
    if (QUOTE_CHARS.has(char)) return "quote";
    return "symbol";
  }
  if (/\p{Letter}|\p{Number}/u.test(char)) return "word";
  return "symbol";
}

function inRanges(
  codePoint: number,
  ranges: readonly (readonly [number, number])[],
): boolean {
  for (const [start, end] of ranges) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

function isWideText(text: string): boolean {
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && inRanges(codePoint, WIDE_RANGES)) {
      return true;
    }
  }
  return false;
}

// A colon only glues inside indivisible units (times, IPv6, MAC, host:port);
// before a slash it is a path separator (drive letters, URL schemes);
// elsewhere it separates ("error:", "key:value").
function resolveColonRuns(
  cells: readonly string[],
  classes: CellClass[],
  colonColumns: readonly number[],
): void {
  let index = 0;
  while (index < colonColumns.length) {
    const start = colonColumns[index];
    let end = start;
    index += 1;
    while (index < colonColumns.length && colonColumns[index] === end + 1) {
      end = colonColumns[index];
      index += 1;
    }
    const before = start > 0 ? (cells[start - 1] ?? "") : "";
    const after = end + 1 < cells.length ? (cells[end + 1] ?? "") : "";
    if (isHexDigitText(before) && isHexDigitText(after)) {
      for (let column = start; column <= end; column += 1) {
        classes[column] = "glue";
      }
    } else if (after === "/" || after === "\\") {
      for (let column = start; column <= end; column += 1) {
        classes[column] = "path";
      }
    }
  }
}

// Dots glue digits only (versions, IPs); letter dots break words so the path
// ladder can extend "changelog" to "changelog.md".
function resolveDotRuns(
  cells: readonly string[],
  classes: CellClass[],
  dotColumns: readonly number[],
): void {
  let index = 0;
  while (index < dotColumns.length) {
    const start = dotColumns[index];
    let end = start;
    index += 1;
    while (index < dotColumns.length && dotColumns[index] === end + 1) {
      end = dotColumns[index];
      index += 1;
    }
    const before = start > 0 ? (cells[start - 1] ?? "") : "";
    const after = end + 1 < cells.length ? (cells[end + 1] ?? "") : "";
    if (isDigitText(before) && isDigitText(after)) {
      for (let column = start; column <= end; column += 1) {
        classes[column] = "glue";
      }
    }
  }
}

function isHexDigitText(text: string): boolean {
  return /^[0-9a-fA-F]$/u.test(text);
}

function isDigitText(text: string): boolean {
  return /^[0-9]$/u.test(text);
}

function tokenizeColumns(classes: readonly CellClass[]): Token[] {
  const primitive: Token[] = [];
  for (let column = 0; column < classes.length; ) {
    let end = column + 1;
    while (end < classes.length && classes[end] === classes[column]) end += 1;
    primitive.push({
      start: column,
      end: end - 1,
      class: classes[column],
    });
    column = end;
  }

  const tokens: Token[] = [];
  let index = 0;
  while (index < primitive.length) {
    const token = primitive[index];
    if (token.class === "glue") {
      const last = tokens[tokens.length - 1];
      const next = primitive[index + 1];
      if (last && next && last.class === "word" && next.class === "word") {
        last.end = next.end;
        index += 2;
        continue;
      }
    }
    tokens.push(token);
    index += 1;
  }
  return tokens;
}

function containerChainAt(
  cells: readonly string[],
  column: number,
): ContainerSpan[] {
  const logical = logicalChars(cells);
  if (logical.length === 0) return [];
  const classes = classifyColumns(cells);
  const classAt = (target: number): CellClass => classes[target] ?? "space";
  const quotes = quoteSpans(logical, classAt);
  const spans = [...quotes, ...bracketSpans(logical, quotes)];
  return spans
    .filter(
      (span) =>
        span.openColumn <= column &&
        column <= span.closeColumn + span.closeWidth - 1,
    )
    .sort(
      (left, right) =>
        left.closeColumn -
        left.openColumn -
        (right.closeColumn - right.openColumn),
    );
}

function logicalChars(cells: readonly string[]): LogicalChar[] {
  const chars: LogicalChar[] = [];
  for (let column = 0; column < cells.length; column += 1) {
    const text = cells[column] ?? "";
    if (text === "") continue;
    chars.push({
      char: text,
      column,
      width: isWideText(text) ? 2 : 1,
    });
  }
  return chars;
}

function quoteSpans(
  logical: readonly LogicalChar[],
  classAt: (column: number) => CellClass,
): ContainerSpan[] {
  const spans: ContainerSpan[] = [];
  for (const quote of QUOTE_CHARS) {
    let index = 0;
    while (index < logical.length) {
      if (
        logical[index].char !== quote ||
        // A quote right after a word char is an apostrophe ("don't"), never an opener.
        !(index === 0 || classAt(logical[index - 1].column) !== "word")
      ) {
        index += 1;
        continue;
      }
      let close = index + 1;
      while (close < logical.length && logical[close].char !== quote) {
        close += 1;
      }
      if (close >= logical.length) break;
      spans.push({
        openColumn: logical[index].column,
        openWidth: logical[index].width,
        closeColumn: logical[close].column,
        closeWidth: logical[close].width,
      });
      index = close + 1;
    }
  }
  return spans;
}

function bracketSpans(
  logical: readonly LogicalChar[],
  quotes: readonly ContainerSpan[],
): ContainerSpan[] {
  const quoted = new Set<number>();
  for (const span of quotes) {
    for (let index = 0; index < logical.length; index += 1) {
      const column = logical[index].column;
      if (column >= span.openColumn && column <= span.closeColumn) {
        quoted.add(index);
      }
    }
  }
  const spans: ContainerSpan[] = [];
  const stack: { opener: string; index: number }[] = [];
  for (let index = 0; index < logical.length; index += 1) {
    if (quoted.has(index)) continue;
    const char = logical[index].char;
    if (BRACKET_OPENERS[char]) {
      stack.push({ opener: char, index });
      continue;
    }
    const opener = BRACKET_CLOSERS[char];
    const top = stack[stack.length - 1];
    if (opener && top && top.opener === opener) {
      stack.pop();
      const open = logical[top.index];
      spans.push({
        openColumn: open.column,
        openWidth: open.width,
        closeColumn: logical[index].column,
        closeWidth: logical[index].width,
      });
    }
  }
  return spans;
}
