import { describe, expect, it } from "vitest";
import {
  containerLadderRangeAt,
  pathLadderRangeAt,
  wordTokenRangeAt,
} from "./wordSelection";

function cellsOf(text: string, cols = text.length * 2 + 8): string[] {
  const cells: string[] = [];
  for (const char of text) {
    cells.push(char);
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint >= 0x1100) cells.push("");
  }
  while (cells.length < cols) cells.push("");
  return cells;
}

describe("word tokenization", () => {
  it("selects the whole contiguous CJK block across spacer cells", () => {
    const cells = ["这", "", "是", "", "一", "", "个", "", "测", "", "试", ""];
    expect(wordTokenRangeAt(cells, 0)).toEqual({ start: 0, end: 11 });
    expect(wordTokenRangeAt(cells, 4)).toEqual({ start: 0, end: 11 });
    expect(wordTokenRangeAt(cells, 11)).toEqual({ start: 0, end: 11 });
  });

  it("breaks between CJK and ASCII runs", () => {
    const cells = cellsOf("中文abc中文");
    expect(wordTokenRangeAt(cells, 0)).toEqual({ start: 0, end: 3 });
    expect(wordTokenRangeAt(cells, 5)).toEqual({ start: 4, end: 6 });
    expect(wordTokenRangeAt(cells, 10)).toEqual({ start: 7, end: 10 });
  });

  it("keeps the colon out of error-style labels and separates key:value", () => {
    const cells = cellsOf("error: 文件未找到");
    expect(wordTokenRangeAt(cells, 0)).toEqual({ start: 0, end: 4 });
    expect(wordTokenRangeAt(cells, 7)).toEqual({ start: 7, end: 16 });
    expect(wordTokenRangeAt(cellsOf("key:value"), 0)).toEqual({
      start: 0,
      end: 2,
    });
    expect(wordTokenRangeAt(cellsOf("key:value"), 6)).toEqual({
      start: 4,
      end: 8,
    });
  });

  it("keeps indivisible colon units whole", () => {
    expect(wordTokenRangeAt(cellsOf("18:30:00"), 3)).toEqual({
      start: 0,
      end: 7,
    });
    expect(wordTokenRangeAt(cellsOf("fe80::1"), 5)).toEqual({
      start: 0,
      end: 6,
    });
    expect(wordTokenRangeAt(cellsOf("de:ad:be:ef:00:11"), 9)).toEqual({
      start: 0,
      end: 16,
    });
    expect(wordTokenRangeAt(cellsOf("127.0.0.1:8080"), 11)).toEqual({
      start: 0,
      end: 13,
    });
  });

  it("keeps glued identifiers whole", () => {
    expect(wordTokenRangeAt(cellsOf("v1.2.3"), 3)).toEqual({
      start: 0,
      end: 5,
    });
    expect(wordTokenRangeAt(cellsOf("foo_bar_1"), 4)).toEqual({
      start: 0,
      end: 8,
    });
    expect(wordTokenRangeAt(cellsOf("user@host"), 6)).toEqual({
      start: 0,
      end: 8,
    });
    expect(wordTokenRangeAt(cellsOf("a=1&b=2"), 5)).toEqual({
      start: 0,
      end: 6,
    });
    expect(wordTokenRangeAt(cellsOf("127.0.0.1:8080"), 11)).toEqual({
      start: 0,
      end: 13,
    });
  });

  it("breaks slash paths into segments for the first double-click", () => {
    expect(wordTokenRangeAt(cellsOf("https://x.com/a?b=1"), 0)).toEqual({
      start: 0,
      end: 4,
    });
    expect(wordTokenRangeAt(cellsOf("/usr/local/bin"), 6)).toEqual({
      start: 5,
      end: 9,
    });
    expect(wordTokenRangeAt(cellsOf("中文/路径"), 5)).toEqual({
      start: 5,
      end: 8,
    });
    expect(wordTokenRangeAt(cellsOf("docs/atlas/changelog.md"), 11)).toEqual({
      start: 11,
      end: 19,
    });
    expect(wordTokenRangeAt(cellsOf("docs/atlas/changelog.md"), 21)).toEqual({
      start: 21,
      end: 22,
    });
  });

  it("stops words at whitespace and punctuation that separates", () => {
    expect(wordTokenRangeAt(cellsOf("end. Next"), 1)).toEqual({
      start: 0,
      end: 2,
    });
    expect(wordTokenRangeAt(cellsOf("end. Next"), 6)).toEqual({
      start: 5,
      end: 8,
    });
    expect(wordTokenRangeAt(cellsOf("ls -la"), 4)).toEqual({
      start: 4,
      end: 5,
    });
    expect(wordTokenRangeAt(cellsOf("--flag"), 4)).toEqual({
      start: 2,
      end: 5,
    });
    expect(wordTokenRangeAt(cellsOf("don't"), 1)).toEqual({ start: 0, end: 2 });
    expect(wordTokenRangeAt(cellsOf("don't"), 4)).toEqual({ start: 4, end: 4 });
    expect(wordTokenRangeAt(cellsOf("foo   bar"), 4)).toEqual({
      start: 3,
      end: 5,
    });
  });

  it("keeps blank padding outside the trailing token", () => {
    const cells = ["w", "o", "r", "d", "", "", "", ""];
    expect(wordTokenRangeAt(cells, 1)).toEqual({ start: 0, end: 3 });
    expect(wordTokenRangeAt(cells, 6)).toEqual({ start: 4, end: 7 });
  });
});

describe("container selection ladder", () => {
  it("walks interior, delimiters and outer pairs in order", () => {
    const cells = cellsOf("\"name:'tom cat 1'\"");
    expect(containerLadderRangeAt(cells, 8, 1)).toEqual({ start: 7, end: 15 });
    expect(containerLadderRangeAt(cells, 8, 2)).toEqual({ start: 6, end: 16 });
    expect(containerLadderRangeAt(cells, 8, 3)).toEqual({ start: 1, end: 16 });
    expect(containerLadderRangeAt(cells, 8, 4)).toEqual({ start: 0, end: 17 });
    expect(containerLadderRangeAt(cells, 8, 5)).toBeNull();
  });

  it("reaches the outer pair directly from a word outside the inner one", () => {
    const cells = cellsOf("\"name:'tom cat 1'\"");
    expect(containerLadderRangeAt(cells, 2, 1)).toEqual({ start: 1, end: 16 });
    expect(containerLadderRangeAt(cells, 2, 2)).toEqual({ start: 0, end: 17 });
    expect(containerLadderRangeAt(cells, 2, 3)).toBeNull();
  });

  it("walks a single quote pair and stops", () => {
    const cells = cellsOf("'tom cat 1'");
    expect(containerLadderRangeAt(cells, 3, 1)).toEqual({ start: 1, end: 9 });
    expect(containerLadderRangeAt(cells, 3, 2)).toEqual({ start: 0, end: 10 });
    expect(containerLadderRangeAt(cells, 3, 3)).toBeNull();
  });

  it("matches brackets while skipping quote content", () => {
    const cells = cellsOf('call("x", [1, 2])');
    expect(containerLadderRangeAt(cells, 11, 1)).toEqual({
      start: 11,
      end: 14,
    });
    expect(containerLadderRangeAt(cells, 11, 2)).toEqual({
      start: 10,
      end: 15,
    });
    expect(containerLadderRangeAt(cells, 11, 3)).toEqual({ start: 5, end: 15 });
    expect(containerLadderRangeAt(cells, 11, 4)).toEqual({ start: 4, end: 16 });
    expect(containerLadderRangeAt(cells, 11, 5)).toBeNull();
  });

  it("treats apostrophes as plain characters", () => {
    const cells = cellsOf("don't");
    expect(containerLadderRangeAt(cells, 1, 1)).toBeNull();
    const quoted = cellsOf("it's 'quoted'");
    expect(containerLadderRangeAt(quoted, 6, 1)).toEqual({
      start: 6,
      end: 11,
    });
    expect(containerLadderRangeAt(quoted, 1, 1)).toBeNull();
  });

  it("handles full-width bracket pairs with wide interior cells", () => {
    const cells = cellsOf("（中文）");
    expect(containerLadderRangeAt(cells, 3, 1)).toEqual({ start: 2, end: 5 });
    expect(containerLadderRangeAt(cells, 3, 2)).toEqual({ start: 0, end: 7 });
    expect(containerLadderRangeAt(cells, 3, 3)).toBeNull();
  });

  it("rejects invalid steps", () => {
    const cells = cellsOf("'x'");
    expect(containerLadderRangeAt(cells, 1, 0)).toBeNull();
    expect(containerLadderRangeAt(cells, 1, -1)).toBeNull();
  });
});

describe("path selection ladder", () => {
  it("extends a segment word to the segment and then the whole path", () => {
    const cells = cellsOf("docs/atlas/changelog.md");
    expect(pathLadderRangeAt(cells, 11, 1)).toEqual({ start: 11, end: 22 });
    expect(pathLadderRangeAt(cells, 11, 2)).toEqual({ start: 0, end: 22 });
    expect(pathLadderRangeAt(cells, 11, 3)).toBeNull();
  });

  it("jumps from a bare segment straight to the whole path", () => {
    const cells = cellsOf("docs/atlas/changelog.md");
    expect(pathLadderRangeAt(cells, 5, 1)).toEqual({ start: 0, end: 22 });
    expect(pathLadderRangeAt(cells, 5, 2)).toBeNull();
    expect(pathLadderRangeAt(cells, 0, 1)).toEqual({ start: 0, end: 22 });
  });

  it("selects a Windows drive path from any segment including the drive letter", () => {
    const cells = cellsOf("PS C:\\Users\\wang\\Coding\\开源仓库\\terax-ai>");
    expect(wordTokenRangeAt(cells, 7)).toEqual({ start: 6, end: 10 });
    expect(pathLadderRangeAt(cells, 7, 1)).toEqual({ start: 3, end: 40 });
    expect(pathLadderRangeAt(cells, 3, 1)).toEqual({ start: 3, end: 40 });
    expect(pathLadderRangeAt(cells, 24, 1)).toEqual({ start: 3, end: 40 });
  });

  it("keeps the URL scheme inside the whole-path step", () => {
    const cells = cellsOf("https://x.com/a?b=1");
    expect(pathLadderRangeAt(cells, 8, 1)).toEqual({ start: 8, end: 12 });
    expect(pathLadderRangeAt(cells, 8, 2)).toEqual({ start: 0, end: 18 });
    expect(pathLadderRangeAt(cells, 14, 1)).toEqual({ start: 0, end: 18 });
    expect(pathLadderRangeAt(cells, 14, 2)).toBeNull();
  });

  it("extends a standalone dotted name without slashes", () => {
    const cells = cellsOf("changelog.md");
    expect(pathLadderRangeAt(cells, 0, 1)).toEqual({ start: 0, end: 11 });
    expect(pathLadderRangeAt(cells, 0, 2)).toBeNull();
  });

  it("keeps plain words and sentence dots off the ladder", () => {
    expect(pathLadderRangeAt(cellsOf("plain words here"), 7, 1)).toBeNull();
    expect(pathLadderRangeAt(cellsOf("end. Next"), 1, 1)).toBeNull();
  });

  it("joins home tilde and dot segments", () => {
    expect(pathLadderRangeAt(cellsOf("~/bin"), 2, 1)).toEqual({
      start: 0,
      end: 4,
    });
    expect(pathLadderRangeAt(cellsOf("./scripts/build.ts"), 10, 1)).toEqual({
      start: 10,
      end: 17,
    });
    expect(pathLadderRangeAt(cellsOf("./scripts/build.ts"), 10, 2)).toEqual({
      start: 0,
      end: 17,
    });
  });
});
