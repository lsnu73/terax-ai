import { expect, it } from "vitest";
import { detectTerminalLinks } from "./terminalLinks";

it("finds ordinary URLs without swallowing prose punctuation", () => {
  expect(
    detectTerminalLinks(
      "See (https://example.com/a_(b)). mailto:me@example.com",
    ).map((link) => link.uri),
  ).toEqual(["https://example.com/a_(b)", "mailto:me@example.com"]);
});
it("ignores executable protocols and incomplete links", () => {
  expect(
    detectTerminalLinks("javascript:alert(1) data:text/html,x https://"),
  ).toEqual([]);
});
it("trims long mixed wrapper suffixes while preserving balanced URL delimiters", () => {
  const uri = "https://example.com/a_(b)[c]{d}";
  const [link] = detectTerminalLinks(`${uri}${")]}".repeat(10_000)}`);
  expect(link).toEqual({ start: 0, end: uri.length, uri });
  expect(detectTerminalLinks("https://[::1]/a_(b)")[0].uri).toBe(
    "https://[::1]/a_(b)",
  );
});
it("preserves Unicode and query parameters with correct text offsets", () => {
  const text = "日本 https://example.com/日本?q=one&x=2 end";
  const [link] = detectTerminalLinks(text);
  expect(text.slice(link.start, link.end)).toBe(
    "https://example.com/日本?q=one&x=2",
  );
});

it("detects Windows drive paths with either slash flavor", () => {
  const text = "cd C:\\Users\\foo\\bar and also C:/work/x done.";
  const links = detectTerminalLinks(text);
  expect(links.map((link) => link.uri)).toEqual([
    "C:\\Users\\foo\\bar",
    "C:/work/x",
  ]);
  for (const link of links) {
    expect(text.slice(link.start, link.end)).toBe(link.uri);
  }
});

it("detects multi-segment POSIX absolute paths but not prose slashes", () => {
  const text = "see /usr/local/bin and /etc, plus /home/me/docs.";
  const links = detectTerminalLinks(text);
  expect(links.map((link) => link.uri)).toEqual([
    "/usr/local/bin",
    "/home/me/docs",
  ]);
  expect(detectTerminalLinks("and/or 3 / 4 a/b")).toEqual([]);
});

it("never matches the path inside an already-detected URL", () => {
  expect(detectTerminalLinks("https://example.com/foo/bar")).toEqual([
    { start: 0, end: 27, uri: "https://example.com/foo/bar" },
  ]);
});

it("trims trailing punctuation and unbalanced brackets from paths", () => {
  const text = "open C:\\work\\demo). see (C:\\work\\a).";
  expect(detectTerminalLinks(text).map((link) => link.uri)).toEqual([
    "C:\\work\\demo",
    "C:\\work\\a",
  ]);
});
