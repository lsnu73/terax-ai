import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  VERSION_FILES,
  assertVersionConsistency,
  inspectVersions,
  readVersionFiles,
} from "./release-version.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = [];

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "terax-release-version-"));
  fixtures.push(root);
  mkdirSync(join(root, "src-tauri"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  for (const file of Object.values(VERSION_FILES)) {
    cpSync(join(sourceRoot, file), join(root, file));
  }
  cpSync(
    join(sourceRoot, "scripts/release-version.mjs"),
    join(root, "scripts/release-version.mjs"),
  );
  return root;
}

function runRelease(root, args) {
  return spawnSync(process.execPath, ["scripts/release-version.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

function initializeGit(root) {
  runGit(root, ["init"]);
  runGit(root, ["config", "user.name", "Release Test"]);
  runGit(root, ["config", "user.email", "release-test@example.com"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "test fixture"]);
}

function fileSnapshot(root) {
  return Object.values(VERSION_FILES).map((file) => readFileSync(join(root, file), "utf8"));
}

function lockBlock(text, packageName) {
  return text
    .split(/(?=^\[\[package\]\]$)/m)
    .find((block) => block.includes(`name = "${packageName}"`));
}

afterEach(() => {
  while (fixtures.length) rmSync(fixtures.pop(), { recursive: true, force: true });
});

describe("release version synchronization", () => {
  it("updates every application version without changing dependency versions", () => {
    const root = createFixture();
    const before = readFileSync(join(root, VERSION_FILES.cargoLock), "utf8");
    const serdeBefore = lockBlock(before, "serde");

    const result = runRelease(root, ["1.2.3"]);

    expect(result.status, result.stderr).toBe(0);
    const files = readVersionFiles(root);
    expect(assertVersionConsistency(files, "v1.2.3")).toBe("1.2.3");
    expect(inspectVersions(files)).toHaveLength(7);
    const after = readFileSync(join(root, VERSION_FILES.cargoLock), "utf8");
    expect(lockBlock(after, "serde")).toBe(serdeBefore);
  });

  it("is idempotent when the version is already synchronized", () => {
    const root = createFixture();
    expect(runRelease(root, ["1.2.3"]).status).toBe(0);
    const before = fileSnapshot(root);

    const result = runRelease(root, ["1.2.3"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Version is already 1.2.3");
    expect(fileSnapshot(root)).toEqual(before);
  });

  it("preserves CRLF line endings in every version file", () => {
    const root = createFixture();
    for (const file of Object.values(VERSION_FILES)) {
      const path = join(root, file);
      writeFileSync(path, readFileSync(path, "utf8").replaceAll(/\r?\n/g, "\r\n"));
    }

    const result = runRelease(root, ["1.2.3"]);

    expect(result.status, result.stderr).toBe(0);
    expect(assertVersionConsistency(readVersionFiles(root))).toBe("1.2.3");
    for (const file of Object.values(VERSION_FILES)) {
      expect(readFileSync(join(root, file), "utf8")).not.toMatch(/(?<!\r)\n/);
    }
  });

  it("checks consistent versions and rejects tag mismatches", () => {
    const root = createFixture();
    const version = assertVersionConsistency(readVersionFiles(root));

    const valid = runRelease(root, ["--check", `v${version}`]);
    const invalid = runRelease(root, ["--check", "v9.9.9"]);

    expect(valid.status, valid.stderr).toBe(0);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain("does not match");
  });

  it("rejects drift without modifying files", () => {
    const root = createFixture();
    const configPath = join(root, VERSION_FILES.tauriConfig);
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.version = "9.9.9";
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    const before = fileSnapshot(root);

    const result = runRelease(root, ["--check"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Version mismatch");
    expect(fileSnapshot(root)).toEqual(before);
  });

  it.each(["1.2", "v1.2.3", "1.2.3-beta.1", "01.2.3"])(
    "rejects invalid version %s before writing",
    (version) => {
      const root = createFixture();
      const before = fileSnapshot(root);

      const result = runRelease(root, [version]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Expected a stable x.y.z version");
      expect(fileSnapshot(root)).toEqual(before);
    },
  );

  it("rejects a missing target before writing any file", () => {
    const root = createFixture();
    const manifestPath = join(root, VERSION_FILES.cargoToml);
    const manifest = readFileSync(manifestPath, "utf8");
    writeFileSync(manifestPath, manifest.replace(/\[workspace\.package\]\r?\nversion = "[^"]+"/, "[workspace.package]"));
    const before = fileSnapshot(root);

    const result = runRelease(root, ["1.2.3"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Expected exactly one version in [workspace.package]");
    expect(fileSnapshot(root)).toEqual(before);
  });

  it("rejects duplicate local lock packages before writing any file", () => {
    const root = createFixture();
    const lockPath = join(root, VERSION_FILES.cargoLock);
    const lock = readFileSync(lockPath, "utf8");
    writeFileSync(lockPath, `${lock}\n${lockBlock(lock, "terax")}`);
    const before = fileSnapshot(root);

    const result = runRelease(root, ["1.2.3"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Expected exactly one Cargo.lock package named terax");
    expect(fileSnapshot(root)).toEqual(before);
  });
});

describe("release git safety", () => {
  it("creates a clean release commit and tag only when requested", () => {
    const root = createFixture();
    initializeGit(root);

    const result = runRelease(root, ["1.2.3", "--commit", "--tag"]);

    expect(result.status, result.stderr).toBe(0);
    expect(runGit(root, ["status", "--porcelain"])).toBe("");
    expect(runGit(root, ["log", "-1", "--pretty=%s"])).toBe("chore(release): v1.2.3");
    expect(runGit(root, ["rev-parse", "v1.2.3^{commit}"])).toBe(runGit(root, ["rev-parse", "HEAD"]));
    expect(assertVersionConsistency(readVersionFiles(root))).toBe("1.2.3");
  });

  it("rejects a dirty worktree before changing versions", () => {
    const root = createFixture();
    initializeGit(root);
    writeFileSync(join(root, "unrelated.txt"), "do not include\n");
    const before = fileSnapshot(root);

    const result = runRelease(root, ["1.2.3", "--commit"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("worktree must be clean");
    expect(fileSnapshot(root)).toEqual(before);
    expect(runGit(root, ["log", "-1", "--pretty=%s"])).toBe("test fixture");
  });

  it("rejects an existing tag before changing versions", () => {
    const root = createFixture();
    initializeGit(root);
    runGit(root, ["tag", "v1.2.3"]);
    const before = fileSnapshot(root);

    const result = runRelease(root, ["1.2.3", "--commit", "--tag"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Tag v1.2.3 already exists");
    expect(fileSnapshot(root)).toEqual(before);
  });

  it("requires --commit with --tag", () => {
    const root = createFixture();
    const before = fileSnapshot(root);

    const result = runRelease(root, ["1.2.3", "--tag"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--tag requires --commit");
    expect(fileSnapshot(root)).toEqual(before);
  });
});
