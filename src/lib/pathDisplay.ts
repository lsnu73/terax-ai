const ELLIPSIS = "…";

type ParsedPath = {
  prefix: string;
  separator: string;
  segments: string[];
};

function parsePath(path: string): ParsedPath {
  const windows = /^([a-zA-Z]:)[\\/]/.exec(path);
  if (windows) {
    return {
      prefix: windows[0],
      separator: windows[0][2],
      segments: path.slice(windows[0].length).split(/[\\/]/).filter(Boolean),
    };
  }

  const unc = /^\\\\[^\\/]+[\\/][^\\/]+/.exec(path);
  if (unc) {
    const separator = path[unc[0].length] === "/" ? "/" : "\\";
    return {
      prefix: `${unc[0]}${path[unc[0].length] ? separator : ""}`,
      separator,
      segments: path.slice(unc[0].length).split(/[\\/]/).filter(Boolean),
    };
  }

  const posix = /^\/+/.exec(path);
  if (posix) {
    return {
      prefix: posix[0],
      separator: "/",
      segments: path.slice(posix[0].length).split(/[\\/]/).filter(Boolean),
    };
  }

  const separator = path.includes("\\") ? "\\" : "/";
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length < 2) return { prefix: "", separator, segments };
  return {
    prefix: `${segments[0]}${separator}`,
    separator,
    segments: segments.slice(1),
  };
}

export function compactPath(
  path: string,
  maxWidth: number,
  measureText: (text: string) => number,
): string {
  if (!path || !Number.isFinite(maxWidth) || measureText(path) <= maxWidth) {
    return path;
  }

  const { prefix, separator, segments } = parsePath(path);
  const leafIndex = segments.length - 1;
  if (leafIndex < 0) return path;

  const leafCharacters = Array.from(segments[leafIndex]);
  const hidden = new Set<number>();
  const processed = new Set<number>();
  const candidates = segments
    .map((value, index) => ({ index, width: measureText(value) }))
    .sort((a, b) => b.width - a.width || b.index - a.index);
  let leafLength = leafCharacters.length;

  const render = () => {
    let ellipsisAdded = false;
    const visible: string[] = [];
    segments.forEach((segment, index) => {
      if (hidden.has(index)) {
        if (!ellipsisAdded) {
          visible.push(ELLIPSIS);
          ellipsisAdded = true;
        }
        return;
      }
      if (index !== leafIndex) {
        visible.push(segment);
        return;
      }
      const leaf = leafCharacters.slice(0, leafLength).join("");
      visible.push(
        leafLength < leafCharacters.length ? `${leaf}${ELLIPSIS}` : leaf,
      );
    });
    return `${prefix}${visible.join(separator)}`;
  };

  while (true) {
    if (processed.has(leafIndex)) {
      leafLength = leafCharacters.length;
      while (leafLength > 1 && measureText(render()) > maxWidth) {
        leafLength -= 1;
      }
    }

    const result = render();
    if (measureText(result) <= maxWidth) return result;

    const next = candidates.find(({ index }) => !processed.has(index));
    if (!next) return result;
    processed.add(next.index);
    if (next.index !== leafIndex) hidden.add(next.index);
  }
}
