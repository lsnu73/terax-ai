import { tool } from "ai";
import { z } from "zod";
import { native, type ShellDescription } from "../lib/native";
import { aiNeedsApproval } from "../lib/approvalMode";
import { checkShellCommand } from "../lib/security";
import type { ToolContext } from "./context";
import {
  currentWorkspaceEnv,
  workspaceScopeKey,
  type WorkspaceEnv,
} from "@/modules/workspace";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { proxyForScenario } from "@/modules/proxy/lib/proxy";

// AI 执行的命令跟随「终端代理」。每次调用时读取最新配置：agent shell 每条
// 命令都是新进程（仅 cwd 跨调用保留），所以开关切换后下一条命令即生效，
// 无需重建会话。
function terminalProxy(): string | null {
  return proxyForScenario(usePreferencesStore.getState(), "terminal");
}

/**
 * Per-session lazy shell-session id. The agent gets one persistent shell per
 * chat session, so cwd survives across tool calls (cd, mkdir+cd, etc).
 */
const sessionShells = new Map<string, Promise<number>>();

async function getSessionShell(
  sessionKey: string,
  cwd: string | null,
  workspace: WorkspaceEnv,
): Promise<number> {
  let p = sessionShells.get(sessionKey);
  if (!p) {
    p = native.shellSessionOpen(cwd, workspace);
    sessionShells.set(sessionKey, p);
  }
  return p;
}

function workspaceSessionKey(
  sessionId: string,
  workspace: WorkspaceEnv,
): string {
  return `${sessionId}:${workspaceScopeKey(workspace)}`;
}

function commandSyntaxInstructions(shell: ShellDescription): string {
  switch (shell.command_dialect) {
    case "powershell":
      return `Commands are parsed by ${shell.shell} using PowerShell syntax, not Bash. The bash prefix in the tool name is historical. Use PowerShell syntax such as $env:VAR, -split ';', Where-Object and Join-Path. Do not use POSIX-only syntax such as export VAR=value or mkdir -p.`;
    case "cmd":
      return "Commands are parsed by cmd.exe /C, not Bash or PowerShell. The bash prefix in the tool name is historical. Use cmd.exe syntax such as set VAR=value and dir; do not use PowerShell or POSIX-only syntax.";
    case "posix":
      return `Commands are parsed by ${shell.shell} using POSIX sh syntax. Use sh-compatible syntax and do not assume Bash-only features such as arrays, [[ ... ]] or source.`;
  }
}

function failureDetails(shell: ShellDescription) {
  const hint =
    shell.command_dialect === "powershell"
      ? `If retrying, remember that ${shell.shell} parses this command as PowerShell, not Bash. Use PowerShell syntax.`
      : shell.command_dialect === "cmd"
        ? "If retrying, remember that cmd.exe /C parses this command. Use cmd.exe syntax, not PowerShell or POSIX syntax."
        : `If retrying, remember that ${shell.shell} parses this command using POSIX sh syntax. Avoid Bash-only features.`;
  return {
    shell: shell.shell,
    command_dialect: shell.command_dialect,
    hint,
  };
}

export function buildShellTools(ctx: ToolContext, shell: ShellDescription) {
  return {
    bash_run: tool({
      description: `Run a foreground command in this session's agent shell. cwd persists across calls (so cd foo then bash_run pwd works). Use for short-lived commands (lint, test, search, build). For long-running or daemon processes, use bash_background. Never invoke interactive tools because they will hang. Asks for user approval. ${commandSyntaxInstructions(shell)}`,
      inputSchema: z.object({
        command: z.string(),
        timeout_secs: z.number().int().min(1).max(300).optional(),
      }),
      needsApproval: aiNeedsApproval,
      execute: async ({ command, timeout_secs }) => {
        const safety = checkShellCommand(command);
        if (!safety.ok) return { error: safety.reason };
        const sid = ctx.getSessionId();
        if (!sid) return { error: "no active chat session" };
        const workspace = currentWorkspaceEnv();
        let executionShell: ShellDescription;
        try {
          executionShell = await native.shellDescribe(workspace);
        } catch (e) {
          return { error: String(e) };
        }
        try {
          const cwd = ctx.getCwd();
          const shellId = await getSessionShell(
            workspaceSessionKey(sid, workspace),
            cwd,
            workspace,
          );
          const r = await native.shellSessionRun(
            shellId,
            command,
            cwd,
            timeout_secs,
            terminalProxy(),
            workspace,
          );
          const result = {
            command,
            stdout: r.stdout,
            stderr: r.stderr,
            exit_code: r.exit_code,
            timed_out: r.timed_out,
            truncated: r.truncated,
            cwd_after: r.cwd_after,
          };
          if (r.timed_out || r.exit_code !== 0) {
            return { ...result, ...failureDetails(executionShell) };
          }
          return result;
        } catch (e) {
          return { error: String(e), ...failureDetails(executionShell) };
        }
      },
    }),

    bash_background: tool({
      description: `Spawn a long-running background process such as pnpm dev, cargo watch or a log tailer. Returns a handle; use bash_logs to read its output and bash_kill to stop it. Output is captured into a 4MB ring buffer. Asks for user approval. ${commandSyntaxInstructions(shell)}`,
      inputSchema: z.object({
        command: z.string(),
        cwd: z.string().nullable().optional(),
      }),
      needsApproval: aiNeedsApproval,
      execute: async ({ command, cwd }) => {
        const safety = checkShellCommand(command);
        if (!safety.ok) return { error: safety.reason };
        const effectiveCwd = cwd ?? ctx.getCwd();
        const workspace = currentWorkspaceEnv();
        let executionShell: ShellDescription;
        try {
          executionShell = await native.shellDescribe(workspace);
        } catch (e) {
          return { error: String(e) };
        }
        try {
          const handle = await native.shellBgSpawn(
            command,
            effectiveCwd,
            terminalProxy(),
            workspace,
          );
          return { handle, command, cwd: effectiveCwd, ok: true };
        } catch (e) {
          return { error: String(e), ...failureDetails(executionShell) };
        }
      },
    }),

    bash_logs: tool({
      description:
        "Read accumulated logs from a `bash_background` process. Pass `since_offset` from the previous response's `next_offset` to tail incrementally. `dropped` reports bytes evicted by the ring buffer.",
      inputSchema: z.object({
        handle: z.number().int(),
        since_offset: z.number().int().optional(),
      }),
      execute: async ({ handle, since_offset }) => {
        try {
          const r = await native.shellBgLogs(handle, since_offset);
          return r;
        } catch (e) {
          return { error: String(e) };
        }
      },
    }),

    bash_list: tool({
      description:
        "List all background processes spawned by `bash_background` in this app — running and exited. **Always call this BEFORE spawning a new long-running process** (especially dev servers like `pnpm dev`, `next dev`, `vite`) to avoid duplicates. If a matching process is already running, reuse it (call `open_preview` again instead of respawning). Auto-executes.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const list = await native.shellBgList();
          return { processes: list };
        } catch (e) {
          return { error: String(e) };
        }
      },
    }),

    bash_kill: tool({
      description:
        "Terminate a `bash_background` process by handle. Idempotent — kills nothing if the handle is unknown or already exited.",
      inputSchema: z.object({ handle: z.number().int() }),
      execute: async ({ handle }) => {
        try {
          await native.shellBgKill(handle);
          return { handle, ok: true };
        } catch (e) {
          return { error: String(e) };
        }
      },
    }),
  } as const;
}
