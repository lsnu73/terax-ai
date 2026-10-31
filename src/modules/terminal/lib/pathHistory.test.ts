import { describe, expect, it } from "vitest";
import {
  PATH_HISTORY_LIMIT_MAX,
  filterPathHistory,
  recordPathHistory,
} from "./pathHistory";
import { buildCdCommand } from "./terminalCd";

describe("recordPathHistory", () => {
  it("records the outgoing directory most-recent-first", () => {
    expect(recordPathHistory([], "C:\\test", 10)).toEqual(["C:\\test"]);
    expect(recordPathHistory(["C:\\test"], "C:\\test1", 10)).toEqual([
      "C:\\test1",
      "C:\\test",
    ]);
  });

  it("collapses duplicates and moves a revisit to the front", () => {
    const history = ["C:\\a", "C:\\b", "C:\\c"];
    expect(recordPathHistory(history, "C:\\a", 10)).toEqual([
      "C:\\a",
      "C:\\b",
      "C:\\c",
    ]);
  });

  it("caps entries at the configured limit", () => {
    let history: string[] = [];
    for (let i = 0; i < 20; i++) {
      history = recordPathHistory(history, `C:\\dir-${i}`, 10);
    }
    expect(history).toHaveLength(10);
    expect(history[0]).toBe("C:\\dir-19");
  });

  it("clamps absurd limits into the supported range", () => {
    let history: string[] = [];
    for (let i = 0; i < PATH_HISTORY_LIMIT_MAX + 5; i++) {
      history = recordPathHistory(history, `C:\\dir-${i}`, 999_999);
    }
    expect(history).toHaveLength(PATH_HISTORY_LIMIT_MAX);
    expect(recordPathHistory([], "C:\\x", 0)).toEqual(["C:\\x"]);
  });

  it("ignores empty paths", () => {
    expect(recordPathHistory(["C:\\keep"], "", 10)).toEqual(["C:\\keep"]);
  });
});

describe("filterPathHistory", () => {
  const history = ["C:\\test\\alpha", "C:\\test1", "/home/me/docs"];

  it("returns everything for an empty query", () => {
    expect(filterPathHistory(history, "  ")).toEqual(history);
  });

  it("matches case-insensitive substrings", () => {
    expect(filterPathHistory(history, "TEST1")).toEqual(["C:\\test1"]);
    expect(filterPathHistory(history, "docs")).toEqual(["/home/me/docs"]);
  });
});

describe("buildCdCommand", () => {
  it("double-quotes the path", () => {
    expect(buildCdCommand("C:\\test dir")).toBe('cd "C:\\test dir"');
  });

  it("strips trailing separators so they cannot escape the closing quote", () => {
    expect(buildCdCommand("C:\\test\\")).toBe('cd "C:\\test"');
    expect(buildCdCommand("/home/me/")).toBe('cd "/home/me"');
  });

  it("keeps the root path intact", () => {
    expect(buildCdCommand("/")).toBe('cd "/"');
  });

  it("escapes embedded double quotes", () => {
    expect(buildCdCommand('C:\\we"ird')).toBe('cd "C:\\we\\"ird"');
  });
});
