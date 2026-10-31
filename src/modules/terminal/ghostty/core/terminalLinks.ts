export type TerminalTextLink = { start: number; end: number; uri: string };

/**
 * Characters that terminate a link token: whitespace and shell-hostile
 * metacharacters. Written as a raw regex fragment shared by every pattern.
 */
const LINK_STOP = `[^\\s<>"'\`\\u0000-\\u001f\\u007f]`;
const URL_PATTERN = new RegExp(
  `(?:https?:\\/\\/|mailto:)${LINK_STOP}+`,
  "giu",
);
/** Windows drive paths like C:\Users\foo or C:/Users/foo. */
const WINDOWS_PATH_PATTERN = new RegExp(
  `(?<![\\w~.\\\\/])[A-Za-z]:[\\\\/]${LINK_STOP}+`,
  "gu",
);
/**
 * POSIX absolute paths. Two or more segments are required so prose like
 * "and/or" or scoreboard-looking "3 / 4" stays ordinary text.
 */
const POSIX_PATH_PATTERN = new RegExp(
  `(?<![\\w~.\\\\/])\\/(?:${LINK_STOP}+\\/)+${LINK_STOP}*`,
  "gu",
);

const OPENS = "([{";
const CLOSES = ")]}";
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** Strips trailing punctuation and unbalanced closing brackets, like URLs. */
function trimLinkTail(token: string): string {
  const trimmed = token.replace(TRAILING_PUNCTUATION, "");
  const balance = [0, 0, 0];
  for (let index = 0; index < trimmed.length; index++) {
    const open = OPENS.indexOf(trimmed[index]);
    const close = CLOSES.indexOf(trimmed[index]);
    if (open >= 0) balance[open]++;
    if (close >= 0) balance[close]--;
  }
  let end = trimmed.length;
  while (end > 0) {
    const close = CLOSES.indexOf(trimmed[end - 1]);
    if (close < 0 || balance[close] >= 0) break;
    balance[close]++;
    end--;
  }
  return trimmed.slice(0, end);
}

function overlaps(
  link: TerminalTextLink,
  existing: TerminalTextLink[],
): boolean {
  return existing.some(
    (other) => link.start < other.end && other.start < link.end,
  );
}

const MAX_LINKS = 256;

export function detectTerminalLinks(text: string): TerminalTextLink[] {
  const links: TerminalTextLink[] = [];
  /** Returns false when the scan should stop (limit reached). */
  const push = (match: RegExpExecArray, uri: string): boolean => {
    if (!uri) return true;
    const link = {
      start: match.index,
      end: match.index + uri.length,
      uri,
    };
    if (overlaps(link, links)) return true;
    links.push(link);
    return links.length < MAX_LINKS;
  };

  for (
    let match = URL_PATTERN.exec(text);
    match;
    match = URL_PATTERN.exec(text)
  ) {
    const tail = trimLinkTail(match[0]);
    try {
      const parsed = new URL(tail);
      if (parsed.protocol !== "mailto:" && !parsed.hostname) continue;
    } catch {
      /* Incomplete URLs stay ordinary terminal text. */
      continue;
    }
    if (!push(match, tail)) break;
  }

  for (
    let match = WINDOWS_PATH_PATTERN.exec(text);
    match;
    match = WINDOWS_PATH_PATTERN.exec(text)
  ) {
    if (!push(match, trimLinkTail(match[0]))) break;
  }

  for (
    let match = POSIX_PATH_PATTERN.exec(text);
    match;
    match = POSIX_PATH_PATTERN.exec(text)
  ) {
    if (!push(match, trimLinkTail(match[0]))) break;
  }

  return links;
}
