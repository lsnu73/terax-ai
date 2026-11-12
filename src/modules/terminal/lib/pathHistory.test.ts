import { describe, expect, it } from "vitest";
import {
  PATH_HISTORY_LIMIT_MAX,
  filterPathHistory,
  isWindowsDrivePath,
  normalizePathHistoryForEnv,
  recordPathHistory,
  windowsPathToWsl,
  wslMountPathToWindows,
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

describe("windowsPathToWsl", () => {
  it("prefixes Windows drive paths with the automount root", () => {
    expect(windowsPathToWsl("C:\\Users\\wang", "/mnt/")).toBe(
      "/mnt/c/Users/wang",
    );
    expect(windowsPathToWsl("c:/x/y", "/w/")).toBe("/w/c/x/y");
    expect(windowsPathToWsl("C:\\", "/mnt")).toBe("/mnt/c");
    expect(windowsPathToWsl("C:", "/mnt/")).toBe("/mnt/c");
  });

  it("leaves non-Windows paths alone", () => {
    expect(windowsPathToWsl("/home/me", "/mnt/")).toBeNull();
    expect(windowsPathToWsl("relative/path", "/mnt/")).toBeNull();
  });
});

describe("wslMountPathToWindows", () => {
  it("strips the mount root and restores the drive letter", () => {
    expect(wslMountPathToWindows("/mnt/c/Users/wang", "/mnt/")).toBe(
      "C:\\Users\\wang",
    );
    expect(wslMountPathToWindows("/w/c/x", "/w/")).toBe("C:\\x");
    expect(wslMountPathToWindows("/mnt/c", "/mnt/")).toBe("C:\\");
    expect(wslMountPathToWindows("/mnt/c/", "/mnt/")).toBe("C:\\");
  });

  it("rejects paths outside the mount root or without a drive segment", () => {
    expect(wslMountPathToWindows("/home/me", "/mnt/")).toBeNull();
    expect(wslMountPathToWindows("/mnt/cdrom", "/mnt/")).toBeNull();
    expect(wslMountPathToWindows("/mnt/c/x", "/w/")).toBeNull();
  });
});

describe("normalizePathHistoryForEnv", () => {
  it("detects Windows drive paths in both separators", () => {
    expect(isWindowsDrivePath("C:\\Users")).toBe(true);
    expect(isWindowsDrivePath("c:/Users")).toBe(true);
    expect(isWindowsDrivePath("/home/me")).toBe(false);
    expect(isWindowsDrivePath("/mnt/c")).toBe(false);
  });

  it("windows view converts mount paths and hides Linux-only directories", () => {
    const history = [
      "C:\\a",
      "/mnt/c/b",
      "/w/c/d",
      "/home/me",
      "/dev/null",
      "C:/a",
    ];
    expect(
      normalizePathHistoryForEnv(history, { kind: "local" }, "/w/"),
    ).toEqual(["C:\\a", "C:\\b", "C:\\d"]);
  });

  it("wsl view keeps linux paths and prefixes Windows paths", () => {
    const history = ["/home/me", "/w/c/x", "C:\\proj"];
    expect(
      normalizePathHistoryForEnv(
        history,
        { kind: "wsl", distro: "Ubuntu" },
        "/w/",
      ),
    ).toEqual(["/home/me", "/w/c/x", "/w/c/proj"]);
  });

  it("merges entries recorded in both formats, most recent first", () => {
    const history = ["/mnt/c/work", "C:\\work", "/mnt/c/deep"];
    expect(
      normalizePathHistoryForEnv(history, { kind: "local" }, "/mnt/"),
    ).toEqual(["C:\\work", "C:\\deep"]);
  });

  it("falls back to the default mount root when the lookup is empty", () => {
    expect(windowsPathToWsl("C:\\x", "")).toBe("/mnt/c/x");
    expect(
      normalizePathHistoryForEnv(["/mnt/c/x"], { kind: "local" }, ""),
    ).toEqual(["C:\\x"]);
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
