import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const VERSION_FILES = {
  packageJson: "package.json",
  tauriConfig: "src-tauri/tauri.conf.json",
  cargoToml: "src-tauri/Cargo.toml",
  cargoLock: "src-tauri/Cargo.lock",
};

const LOCAL_PACKAGES = ["terax", "terax-cli", "terax-control-protocol"];
const STABLE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requireVersion(version) {
  if (!STABLE_VERSION.test(version)) {
    throw new Error(`Expected a stable x.y.z version, received: ${version}`);
  }
}

function updateJsonVersion(text, version, file) {
  const data = JSON.parse(text);
  if (typeof data.version !== "string") {
    throw new Error(`${file} does not contain a string version field`);
  }
  data.version = version;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return `${JSON.stringify(data, null, 2).replaceAll("\n", eol)}${eol}`;
}

function findTomlSection(text, section) {
  const headers = [...text.matchAll(/^[ \t]*\[([^\]]+)\][ \t]*\r?$/gm)];
  const matches = headers.filter((match) => match[1].trim() === section);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one [${section}] section, found ${matches.length}`);
  }
  const match = matches[0];
  const start = match.index + match[0].length;
  const next = headers.find((header) => header.index > match.index);
  return { start, end: next?.index ?? text.length };
}

function tomlSectionVersion(text, section) {
  const { start, end } = findTomlSection(text, section);
  const body = text.slice(start, end);
  const matches = [...body.matchAll(/^[ \t]*version[ \t]*=[ \t]*"([^"]+)"[ \t]*\r?$/gm)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one version in [${section}], found ${matches.length}`);
  }
  return matches[0][1];
}

function updateTomlSectionVersion(text, section, version) {
  const { start, end } = findTomlSection(text, section);
  const body = text.slice(start, end);
  const pattern = /^([ \t]*version[ \t]*=[ \t]*")[^"]+("[ \t]*\r?)$/gm;
  const matches = [...body.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one version in [${section}], found ${matches.length}`);
  }
  return text.slice(0, start) + body.replace(pattern, `$1${version}$2`) + text.slice(end);
}

function lockPackageBlock(text, packageName) {
  const blocks = text.split(/(?=^\[\[package\]\][ \t]*\r?$)/m);
  const namePattern = new RegExp(`^name = "${escapeRegExp(packageName)}"\\r?$`, "m");
  const matches = blocks.filter((block) => namePattern.test(block));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one Cargo.lock package named ${packageName}, found ${matches.length}`);
  }
  return matches[0];
}

function lockPackageVersion(text, packageName) {
  const block = lockPackageBlock(text, packageName);
  const matches = [...block.matchAll(/^version = "([^"]+)"\r?$/gm)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one version for Cargo.lock package ${packageName}`);
  }
  return matches[0][1];
}

function updateLockPackageVersion(text, packageName, version) {
  const block = lockPackageBlock(text, packageName);
  const pattern = /^(version = ")[^"]+("\r?)$/gm;
  const matches = [...block.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one version for Cargo.lock package ${packageName}`);
  }
  const updatedBlock = block.replace(pattern, `$1${version}$2`);
  const index = text.indexOf(block);
  return text.slice(0, index) + updatedBlock + text.slice(index + block.length);
}

export function readVersionFiles(repositoryRoot = root) {
  return Object.fromEntries(
    Object.entries(VERSION_FILES).map(([key, file]) => [
      key,
      readFileSync(resolve(repositoryRoot, file), "utf8"),
    ]),
  );
}

export function inspectVersions(files) {
  return [
    { file: VERSION_FILES.packageJson, version: JSON.parse(files.packageJson).version },
    { file: VERSION_FILES.tauriConfig, version: JSON.parse(files.tauriConfig).version },
    { file: VERSION_FILES.cargoToml, version: tomlSectionVersion(files.cargoToml, "package") },
    { file: VERSION_FILES.cargoToml, version: tomlSectionVersion(files.cargoToml, "workspace.package") },
    ...LOCAL_PACKAGES.map((packageName) => ({
      file: `${VERSION_FILES.cargoLock} (${packageName})`,
      version: lockPackageVersion(files.cargoLock, packageName),
    })),
  ];
}

export function assertVersionConsistency(files, expectedTag) {
  const entries = inspectVersions(files);
  for (const entry of entries) {
    if (typeof entry.version !== "string" || !STABLE_VERSION.test(entry.version)) {
      throw new Error(`Invalid stable version in ${entry.file}: ${entry.version}`);
    }
  }
  const versions = [...new Set(entries.map((entry) => entry.version))];
  if (versions.length !== 1) {
    const details = entries.map((entry) => `${entry.file}: ${entry.version}`).join("\n");
    throw new Error(`Version mismatch:\n${details}`);
  }
  const version = versions[0];
  if (expectedTag && expectedTag !== `v${version}`) {
    throw new Error(`Release tag ${expectedTag} does not match v${version}`);
  }
  return version;
}

export function updateVersions(files, version) {
  requireVersion(version);
  let cargoToml = updateTomlSectionVersion(files.cargoToml, "package", version);
  cargoToml = updateTomlSectionVersion(cargoToml, "workspace.package", version);
  let cargoLock = files.cargoLock;
  for (const packageName of LOCAL_PACKAGES) {
    cargoLock = updateLockPackageVersion(cargoLock, packageName, version);
  }
  const updated = {
    packageJson: updateJsonVersion(files.packageJson, version, VERSION_FILES.packageJson),
    tauriConfig: updateJsonVersion(files.tauriConfig, version, VERSION_FILES.tauriConfig),
    cargoToml,
    cargoLock,
  };
  assertVersionConsistency(updated, `v${version}`);
  return updated;
}

function parseArgs(args) {
  const options = { check: false, commit: false, tag: false, positional: [] };
  for (const arg of args) {
    if (arg === "--check") options.check = true;
    else if (arg === "--commit") options.commit = true;
    else if (arg === "--tag") options.tag = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else options.positional.push(arg);
  }
  if (options.positional.length > 1 || (options.check && (options.commit || options.tag))) {
    throw new Error("Usage: release-version.mjs <x.y.z> [--commit] [--tag] | --check [vX.Y.Z]");
  }
  if (options.tag && !options.commit) {
    throw new Error("--tag requires --commit");
  }
  if (!options.check && options.positional.length !== 1) {
    throw new Error("Usage: release-version.mjs <x.y.z> [--commit] [--tag] | --check [vX.Y.Z]");
  }
  return options;
}

function runGit(repositoryRoot, args, allowedStatuses = [0]) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw new Error(`Could not run git: ${result.error.message}`);
  if (!allowedStatuses.includes(result.status)) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result;
}

function prepareGitRelease(repositoryRoot, version, tag) {
  if (runGit(repositoryRoot, ["status", "--porcelain"]).stdout.trim()) {
    throw new Error("The worktree must be clean before creating a release commit");
  }
  if (tag) {
    const existing = runGit(
      repositoryRoot,
      ["show-ref", "--verify", "--quiet", `refs/tags/v${version}`],
      [0, 1],
    );
    if (existing.status === 0) throw new Error(`Tag v${version} already exists`);
  }
}

function commitAndTag(repositoryRoot, version, tag) {
  const files = Object.values(VERSION_FILES);
  runGit(repositoryRoot, ["add", "--", ...files]);
  runGit(repositoryRoot, ["commit", "-m", `chore(release): v${version}`, "--", ...files]);
  if (tag) runGit(repositoryRoot, ["tag", `v${version}`]);
}

export function runCli(args, repositoryRoot = root) {
  const options = parseArgs(args);
  const files = readVersionFiles(repositoryRoot);
  if (options.check) {
    const version = assertVersionConsistency(files, options.positional[0]);
    console.log(`Version ${version} is consistent${options.positional[0] ? ` with ${options.positional[0]}` : ""}`);
    return;
  }

  const version = options.positional[0];
  const updated = updateVersions(files, version);
  const changed = Object.keys(VERSION_FILES).filter((key) => updated[key] !== files[key]);
  if (changed.length === 0 && (options.commit || options.tag)) {
    throw new Error(`Version is already ${version}; no release commit was created`);
  }
  if (options.commit) prepareGitRelease(repositoryRoot, version, options.tag);
  for (const key of changed) {
    writeFileSync(resolve(repositoryRoot, VERSION_FILES[key]), updated[key], "utf8");
  }
  assertVersionConsistency(readVersionFiles(repositoryRoot), `v${version}`);
  if (options.commit) commitAndTag(repositoryRoot, version, options.tag);

  if (changed.length === 0) console.log(`Version is already ${version}`);
  else console.log(`Updated ${changed.length} version files to ${version}`);
  if (options.commit) console.log(`Created commit chore(release): v${version}`);
  if (options.tag) console.log(`Created tag v${version}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
