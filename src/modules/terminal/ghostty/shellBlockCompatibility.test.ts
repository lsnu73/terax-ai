import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const bashExecutable = process.platform === "darwin" ? "/bin/bash" : "bash";
const bashScript = fileURLToPath(
  new URL(
    "../../../../src-tauri/src/modules/pty/scripts/bashrc.bash",
    import.meta.url,
  ),
);

function runInteractiveBash(lines: string[], setup: string[] = []) {
  return spawnSync(bashExecutable, ["--noprofile", "--norc", "-i"], {
    input: [
      "source() { :; }",
      "PS1='test> '",
      ...setup,
      '. "$TERAX_TEST_SCRIPT" >/dev/null',
      ...lines,
      "exit",
      "",
    ].join("\n"),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HISTFILE: "/dev/null",
      TERAX_BLOCKS: "1",
      TERAX_TEST_SCRIPT: bashScript,
    },
    encoding: "utf8",
    timeout: 5000,
  });
}

function extractBashCommands(output: string): string[] {
  return output
    .split("\x1b]133;C;")
    .slice(1)
    .map((part) => {
      const end = part.indexOf("\x1b\\");
      return end === -1 ? part : part.slice(0, end);
    });
}

it.skipIf(process.platform === "win32")(
  "keeps Bash usable with and without PS0 integration",
  () => {
    const result = spawnSync(
      bashExecutable,
      [
        "--noprofile",
        "--norc",
        "-c",
        `
source() { :; }
export TERAX_BLOCKS=1
PS1='test> '
. "$1" >/dev/null
if (( BASH_VERSINFO[0] > 4 || BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] >= 4 )); then
  test "$TERAX_BLOCKS" = 1 || exit 10
  case "$PS0" in *'133;C'*) ;; *) exit 11 ;; esac
else
  test -z "$TERAX_BLOCKS" || exit 12
  case "$PS1" in *'terax_blocks=0'*'test> '*) ;; *) exit 13 ;; esac
fi
`,
        "terax-test",
        bashScript,
      ],
      {
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
        encoding: "utf8",
        timeout: 5000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  },
);

it.skipIf(process.platform === "win32" || process.platform === "darwin")(
  "reports only newly accepted Bash commands for block actions",
  () => {
    const result = runInteractiveBash(
      [
        "echo first-wsl-command",
        " echo ignored-space",
        "echo ignored-pattern",
        'printf "%s\\n" "second command"',
      ],
      ["HISTCONTROL=ignorespace", "HISTIGNORE='echo ignored-pattern'"],
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(extractBashCommands(result.stderr)).toEqual([
      "echo first-wsl-command",
      "",
      "",
      'printf "%s\\n" "second command"',
      "exit",
    ]);
  },
);

it.skipIf(process.platform === "win32" || process.platform === "darwin")(
  "sanitizes multiline Bash command payloads",
  () => {
    const result = runInteractiveBash(
      ["printf '%s\\n' 'first", "second'"],
      ["set -o lithist"],
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(extractBashCommands(result.stderr)).toEqual([
      "printf '%s\\n' 'first second'",
      "exit",
    ]);
  },
);
