import { describe, expect, it } from "vitest";
import { compactPath } from "./pathDisplay";

const measureCharacters = (text: string) => Array.from(text).length;

describe("compactPath", () => {
  it("leaves a path unchanged when it fits", () => {
    const path = "C:\\Users\\wang\\Coding\\开源仓库\\easyTodo";
    expect(compactPath(path, 100, measureCharacters)).toBe(path);
  });

  it("fully hides the widest intermediate directory", () => {
    expect(
      compactPath("C:\\longest\\medium\\short\\leaf", 25, measureCharacters),
    ).toBe("C:\\…\\medium\\short\\leaf");
  });

  it("partially hides the leaf when it is the widest directory", () => {
    expect(compactPath("C:\\a\\bb\\cccccccc", 13, measureCharacters)).toBe(
      "C:\\a\\bb\\cccc…",
    );
  });

  it("hides the next widest directory when the leaf still cannot fit", () => {
    expect(
      compactPath("C:\\a\\verylong\\abcdefghij", 14, measureCharacters),
    ).toBe("C:\\a\\…\\abcdef…");
  });

  it("keeps a short leaf intact while hiding longer directories", () => {
    expect(compactPath("C:\\long\\mid\\x", 10, measureCharacters)).toBe(
      "C:\\…\\mid\\x",
    );
  });

  it("uses a single ellipsis for multiple hidden directories", () => {
    expect(
      compactPath("C:\\longest\\a\\second\\leaf", 13, measureCharacters),
    ).toBe("C:\\…\\a\\leaf");
  });

  it("prefers the rightmost directory when widths are equal", () => {
    expect(compactPath("C:\\aa\\bb\\cc", 10, measureCharacters)).toBe(
      "C:\\aa\\…\\cc",
    );
  });

  it("selects directories by measured width rather than character count", () => {
    const measurePixels = (text: string) =>
      Array.from(text).reduce(
        (width, character) =>
          width + (/[^\u0000-\u007f]/.test(character) ? 3 : 1),
        0,
      );

    expect(compactPath("C:\\aaaaaaaa\\中文\\leaf", 20, measurePixels)).toBe(
      "C:\\…\\中文\\leaf",
    );
  });

  it("supports POSIX paths", () => {
    expect(
      compactPath("/home/wang/longest/project", 20, measureCharacters),
    ).toBe("/home/wang/…/project");
  });

  it("supports forward-slash Windows paths", () => {
    expect(compactPath("C:/longest/project", 12, measureCharacters)).toBe(
      "C:/…/project",
    );
  });

  it("supports UNC paths without hiding the server and share", () => {
    expect(
      compactPath("\\\\server\\share\\longest\\project", 24, measureCharacters),
    ).toBe("\\\\server\\share\\…\\project");
  });

  it("keeps the first directory of a relative path", () => {
    expect(
      compactPath("workspace\\longest\\project", 19, measureCharacters),
    ).toBe("workspace\\…\\project");
  });

  it("truncates a single leaf without splitting a Unicode code point", () => {
    expect(compactPath("C:\\😀abcdef", 7, measureCharacters)).toBe("C:\\😀ab…");
  });

  it("keeps roots and the leaf opening when the width is impossible", () => {
    const result = compactPath("C:\\middle\\leaf", 2, measureCharacters);
    expect(result.startsWith("C:\\")).toBe(true);
    expect(result).toContain("l…");
  });

  it("leaves root-only and empty paths unchanged", () => {
    expect(compactPath("C:\\", 1, measureCharacters)).toBe("C:\\");
    expect(compactPath("/", 0, measureCharacters)).toBe("/");
    expect(compactPath("", 0, measureCharacters)).toBe("");
  });
});
