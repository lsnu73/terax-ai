import { LOCAL_WORKSPACE, useWorkspaceEnvStore } from "@/modules/workspace";
import { describe, expect, it } from "vitest";
import {
  convertPastedTextForWorkspace,
  mountWindowsPaths,
} from "./pastePathMount";

const DEFAULT_ROOT = "/mnt/";

describe("mountWindowsPaths", () => {
  it("mounts a whole Windows path token", () => {
    expect(
      mountWindowsPaths(
        "C:\\Users\\wang\\Coding\\开源仓库\\terax-ai",
        DEFAULT_ROOT,
      ),
    ).toBe("/mnt/c/Users/wang/Coding/开源仓库/terax-ai");
  });

  it("accepts forward slashes and lowercases the drive", () => {
    expect(mountWindowsPaths("D:/work/app", DEFAULT_ROOT)).toBe(
      "/mnt/d/work/app",
    );
  });

  it("honors the distro automount root, with or without a trailing slash", () => {
    expect(mountWindowsPaths("C:\\a\\b", "/win")).toBe("/win/c/a/b");
    expect(mountWindowsPaths("C:\\a\\b", "/win/")).toBe("/win/c/a/b");
  });

  it("keeps a single pasted path with spaces whole", () => {
    expect(mountWindowsPaths("C:\\Program Files\\My App", DEFAULT_ROOT)).toBe(
      "/mnt/c/Program Files/My App",
    );
    expect(
      mountWindowsPaths("  C:\\Program Files\\My App  ", DEFAULT_ROOT),
    ).toBe("  /mnt/c/Program Files/My App  ");
  });

  it("converts a quoted path and keeps the quotes", () => {
    expect(mountWindowsPaths('"C:\\Program Files\\app"', DEFAULT_ROOT)).toBe(
      '"/mnt/c/Program Files/app"',
    );
    expect(mountWindowsPaths("'C:\\a\\b'", DEFAULT_ROOT)).toBe("'/mnt/c/a/b'");
  });

  it("mounts every Windows path in a longer text", () => {
    expect(mountWindowsPaths("copy C:\\a\\b D:\\out", DEFAULT_ROOT)).toBe(
      "copy /mnt/c/a/b /mnt/d/out",
    );
    expect(
      mountWindowsPaths("C:\\a\\b 和 C:\\c\\d 两个目录", DEFAULT_ROOT),
    ).toBe("/mnt/c/a/b 和 /mnt/c/c/d 两个目录");
  });

  it("leaves non-drive paths and plain text alone", () => {
    expect(mountWindowsPaths("hello world", DEFAULT_ROOT)).toBe("hello world");
    expect(mountWindowsPaths("https://x.com", DEFAULT_ROOT)).toBe(
      "https://x.com",
    );
    expect(mountWindowsPaths("v1.2.3", DEFAULT_ROOT)).toBe("v1.2.3");
    expect(mountWindowsPaths("file:C:\\a", DEFAULT_ROOT)).toBe("file:C:\\a");
    expect(mountWindowsPaths("a:b", DEFAULT_ROOT)).toBe("a:b");
  });

  it("drops a trailing separator like the history helper", () => {
    expect(mountWindowsPaths("C:\\Users\\wang\\", DEFAULT_ROOT)).toBe(
      "/mnt/c/Users/wang",
    );
    expect(mountWindowsPaths("C:\\", DEFAULT_ROOT)).toBe("/mnt/c");
  });
});

describe("convertPastedTextForWorkspace", () => {
  it("converts only while the workspace environment is WSL", async () => {
    useWorkspaceEnvStore.setState({ env: LOCAL_WORKSPACE });
    expect(await convertPastedTextForWorkspace("C:\\a\\b")).toBe("C:\\a\\b");

    useWorkspaceEnvStore.setState({
      env: { kind: "wsl", distro: "Ubuntu" },
    });
    expect(await convertPastedTextForWorkspace("C:\\a\\b")).toBe("/mnt/c/a/b");
    useWorkspaceEnvStore.setState({ env: LOCAL_WORKSPACE });
  });
});
